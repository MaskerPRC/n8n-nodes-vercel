import type { INodeProperties } from 'n8n-workflow';
import { deploymentCreateDescription } from './create';

export const deploymentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deployment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new deployment',
				action: 'Create a deployment',
			},
		],
		default: 'create',
	},
	...deploymentCreateDescription,
];

