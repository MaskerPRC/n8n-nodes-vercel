import type { INodeProperties } from 'n8n-workflow';

const showOnlyForDeploymentCreate = {
	operation: ['create'],
	resource: ['deployment'],
};

export const deploymentCreateDescription: INodeProperties[] = [
	{
		displayName: 'Project Name',
		name: 'projectName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForDeploymentCreate,
		},
		description: 'The name of the Vercel project',
	},
	{
		displayName: 'HTML Content',
		name: 'htmlContent',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForDeploymentCreate,
		},
		description:
			'HTML content to deploy. Can be HTML text or a file path (relative or absolute).',
	},
	{
		displayName: 'Deploy to Production',
		name: 'production',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: showOnlyForDeploymentCreate,
		},
		description: 'Whether to deploy to production environment',
	},
	{
		displayName: 'Deployment Mode',
		name: 'deploymentMode',
		type: 'options',
		options: [
			{
				name: 'Async (Return Immediately)',
				value: 'async',
				description: 'Return deployment ID immediately, check status later',
			},
			{
				name: 'Blocking (Wait for Completion)',
				value: 'blocking',
				description: 'Wait for deployment to complete (success or failure) before returning',
			},
		],
		default: 'async',
		displayOptions: {
			show: showOnlyForDeploymentCreate,
		},
		description: 'Whether to wait for deployment completion or return immediately',
	},
	{
		displayName: 'Max Wait Time (seconds)',
		name: 'maxWaitTime',
		type: 'number',
		default: 300,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['deployment'],
				deploymentMode: ['blocking'],
			},
		},
		description: 'Maximum time to wait for deployment completion (only for blocking mode)',
	},
];

