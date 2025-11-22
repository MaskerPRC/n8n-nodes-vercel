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
			'HTML content to deploy. Can be HTML text or a file path (relative or absolute)',
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
];

