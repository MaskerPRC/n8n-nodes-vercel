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
import { promises as fs, createWriteStream } from 'fs';
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
					const projectId = await this.createOrGetProject.call(this, sanitizedName);

					// 禁用项目保护
					await this.disableProjectProtection.call(this, projectId);

					// 创建临时目录和文件
					const tempDir = path.join(tmpdir(), `vercel-${Date.now()}-${i}`);
					await fs.mkdir(tempDir, { recursive: true });

					try {
						// 创建项目文件
						await this.createProjectFiles(tempDir, html);

						// 部署项目
						const deployment = await this.deployProject.call(
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
						} catch (e) {
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

	/**
	 * 创建或获取项目
	 */
	async createOrGetProject(
		this: IExecuteFunctions,
		projectName: string,
	): Promise<string> {
		try {
			// 尝试获取现有项目列表
			const projects = await vercelApiRequest.call(this, 'GET', '/v9/projects');
			const existing = projects.projects?.find((p: any) => p.name === projectName);

			if (existing) {
				return existing.id;
			}
		} catch (e) {
			// 如果获取失败，继续创建新项目
		}

		// 创建新项目
		const project = await vercelApiRequest.call(this, 'POST', '/v9/projects', {
			name: projectName,
			framework: null,
		});

		return project.id;
	}

	/**
	 * 禁用项目保护
	 */
	async disableProjectProtection(
		this: IExecuteFunctions,
		projectId: string,
	): Promise<void> {
		try {
			await vercelApiRequest.call(this, 'PATCH', `/v9/projects/${projectId}`, {
				ssoProtection: null,
				passwordProtection: null,
			});
		} catch (e) {
			// 忽略错误
		}
	}

	/**
	 * 创建项目文件
	 */
	async createProjectFiles(projectDir: string, htmlContent: string): Promise<void> {
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
	 */
	async deployProject(
		this: IExecuteFunctions,
		projectDir: string,
		projectId: string,
		production: boolean,
	): Promise<any> {
		// 使用 Vercel API 创建部署
		// 需要将文件打包成 tar.gz 格式
		const archiver = await import('archiver');
		const FormData = (await import('form-data')).default;

		// 创建 tar.gz 文件
		const tarPath = path.join(tmpdir(), `vercel-deploy-${Date.now()}.tar.gz`);

		return new Promise((resolve, reject) => {
			const writeStream = createWriteStream(tarPath);
			const archive = archiver.default('tar', {
				gzip: true,
			});

			archive.pipe(writeStream);

			// 添加文件到归档
			archive.file(path.join(projectDir, 'index.html'), { name: 'index.html' });
			archive.file(path.join(projectDir, 'package.json'), { name: 'package.json' });
			archive.file(path.join(projectDir, 'vercel.json'), { name: 'vercel.json' });

			archive.finalize();

			writeStream.on('close', async () => {
				try {
					// 读取 tar.gz 文件
					const tarFile = await fs.readFile(tarPath);

					// 创建 FormData
					const form = new FormData();
					form.append('files', tarFile, {
						filename: 'project.tar.gz',
						contentType: 'application/gzip',
					});

					// 获取凭证
					const credentials = await this.getCredentials('vercelApi');
					const teamId = credentials.teamId as string | undefined;

					// 构建 URL
					let deployUrl = `/v13/deployments?projectId=${projectId}`;
					if (teamId) {
						deployUrl += `&teamId=${teamId}`;
					}
					if (production) {
						deployUrl += '&target=production';
					}

					// 使用 n8n 的 HTTP 请求方法
					const options = {
						method: 'POST',
						url: `https://api.vercel.com${deployUrl}`,
						headers: {
							Authorization: `Bearer ${credentials.accessToken}`,
							...form.getHeaders(),
						},
						body: form,
					};

					const response = await this.helpers.httpRequest(options);

					// 清理临时文件
					try {
						await fs.unlink(tarPath);
					} catch (e) {
						// 忽略错误
					}

					resolve(response);
				} catch (error) {
					// 清理临时文件
					try {
						await fs.unlink(tarPath);
					} catch (e) {
						// 忽略错误
					}
					reject(error);
				}
			});

			archive.on('error', (err: Error) => {
				reject(err);
			});

			writeStream.on('error', (err: Error) => {
				reject(err);
			});
		});
	}
}

