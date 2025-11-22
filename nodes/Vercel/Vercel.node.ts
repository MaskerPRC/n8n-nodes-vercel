import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { deploymentDescription } from './resources/deployment';
import { vercelApiRequest } from './shared/transport';
import { sanitizeProjectName, readHtmlContent } from './shared/utils';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

export class Vercel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vercel',
		name: 'vercel',
		icon: { light: 'file:../../icons/vercel.svg', dark: 'file:../../icons/vercel.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Deploy static HTML sites to Vercel',
		defaults: {
			name: 'Vercel',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'vercelApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Deployment',
						value: 'deployment',
					},
				],
				default: 'deployment',
			},
			...deploymentDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'deployment' && operation === 'create') {
					const projectName = this.getNodeParameter('projectName', i) as string;
					const htmlContent = this.getNodeParameter('htmlContent', i) as string;
					const production = this.getNodeParameter('production', i, true) as boolean;

					// 读取 HTML 内容
					const html = await readHtmlContent(htmlContent);

					// 清理项目名称
					const sanitizedName = sanitizeProjectName(projectName);

					// 创建或获取项目
					const projectId = await createOrGetProject(this, sanitizedName);

					// 禁用项目保护
					await disableProjectProtection(this, projectId);

					// 创建临时目录和文件
					const tempDir = path.join(tmpdir(), `vercel-${Date.now()}-${i}`);
					await fs.mkdir(tempDir, { recursive: true });

					try {
						// 创建项目文件
						await createProjectFiles(tempDir, html);

						// 部署项目
						const deployment = await deployProject(
							this,
							tempDir,
							projectId,
							production,
						);

						// 获取部署 URL
						const deploymentUrl = deployment.url
							? `https://${deployment.url}`
							: `https://${sanitizedName}.vercel.app`;

						returnData.push({
							json: {
								success: true,
								projectId,
								projectName: sanitizedName,
								deploymentId: deployment.id,
								url: deploymentUrl,
								deployment,
							},
							pairedItem: { item: i },
						});
					} finally {
						// 清理临时目录
						try {
							await fs.rm(tempDir, { recursive: true, force: true });
					} catch {
						// 忽略清理错误
					}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/**
 * 创建或获取项目
 */
async function createOrGetProject(
	executeFunctions: IExecuteFunctions,
	projectName: string,
): Promise<string> {
	try {
		// 尝试获取现有项目列表
		const projects = await vercelApiRequest.call(executeFunctions, 'GET', '/v9/projects');
		const existing = projects.projects?.find((p: { name: string }) => p.name === projectName);

		if (existing) {
			return existing.id;
		}
	} catch {
		// 如果获取失败，继续创建新项目
	}

	// 创建新项目
	const project = await vercelApiRequest.call(executeFunctions, 'POST', '/v9/projects', {
		name: projectName,
		framework: null,
	});

	return project.id;
}

/**
 * 禁用项目保护
 */
async function disableProjectProtection(
	executeFunctions: IExecuteFunctions,
	projectId: string,
): Promise<void> {
	try {
		await vercelApiRequest.call(executeFunctions, 'PATCH', `/v9/projects/${projectId}`, {
			ssoProtection: null,
			passwordProtection: null,
		});
	} catch {
		// 忽略错误
	}
}

/**
 * 创建项目文件
 */
async function createProjectFiles(projectDir: string, htmlContent: string): Promise<void> {
	// 创建 index.html
	await fs.writeFile(path.join(projectDir, 'index.html'), htmlContent, 'utf-8');

	// 创建 package.json
	const packageJson = {
		name: path.basename(projectDir),
		version: '1.0.0',
		description: 'Static HTML site deployed to Vercel',
		private: true,
	};
	await fs.writeFile(
		path.join(projectDir, 'package.json'),
		JSON.stringify(packageJson, null, 2),
		'utf-8',
	);

	// 创建 vercel.json
	const vercelConfig = {
		version: 2,
		routes: [{ src: '/(.*)', dest: '/$1' }],
	};
	await fs.writeFile(
		path.join(projectDir, 'vercel.json'),
		JSON.stringify(vercelConfig, null, 2),
		'utf-8',
	);
}

/**
 * 部署项目
 * 使用 Vercel API v13/deployments 端点
 * 文件需要以 base64 编码的 JSON 格式发送
 */
async function deployProject(
	executeFunctions: IExecuteFunctions,
	projectDir: string,
	projectId: string,
	production: boolean,
): Promise<{ id: string; url?: string; [key: string]: unknown }> {
	const credentials = await executeFunctions.getCredentials('vercelApi');
	const teamId = credentials.teamId as string | undefined;

	// 读取所有文件内容
	const indexHtml = await fs.readFile(path.join(projectDir, 'index.html'), 'utf-8');
	const packageJsonContent = await fs.readFile(
		path.join(projectDir, 'package.json'),
		'utf-8',
	);
	const vercelJsonContent = await fs.readFile(
		path.join(projectDir, 'vercel.json'),
		'utf-8',
	);

	// 创建文件列表，每个文件包含路径和内容（base64 编码）
	const files = [
		{
			file: 'index.html',
			data: Buffer.from(indexHtml).toString('base64'),
		},
		{
			file: 'package.json',
			data: Buffer.from(packageJsonContent).toString('base64'),
		},
		{
			file: 'vercel.json',
			data: Buffer.from(vercelJsonContent).toString('base64'),
		},
	];

	// 构建请求体
	const requestBody: any = {
		name: path.basename(projectDir),
		files: files,
		projectSettings: {
			framework: null,
		},
	};

	// 构建 URL
	let deployUrl = `/v13/deployments?projectId=${projectId}`;
	if (teamId) {
		deployUrl += `&teamId=${teamId}`;
	}
	if (production) {
		deployUrl += '&target=production';
	}

	// 使用 vercelApiRequest 发送请求
	const response = await vercelApiRequest.call(
		executeFunctions,
		'POST',
		deployUrl,
		requestBody,
	);

	return response;
}

