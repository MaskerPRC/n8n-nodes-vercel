/**
 * 清理项目名称，移除特殊字符
 */
export function sanitizeProjectName(name: string): string {
	return name
		.replace(/[^a-z0-9]/gi, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/**
 * 从 HTML 输入中读取内容
 * 支持文件路径或直接 HTML 文本
 */
export async function readHtmlContent(htmlInput: string): Promise<string> {
	const fs = await import('fs/promises');
	const path = await import('path');

	// 尝试作为文件路径处理
	try {
		const resolvedPath = path.isAbsolute(htmlInput)
			? htmlInput
			: path.resolve(process.cwd(), htmlInput);

		const stats = await fs.stat(resolvedPath);
		if (stats.isFile()) {
			const content = await fs.readFile(resolvedPath, 'utf-8');
			if (!content.trim()) {
				throw new Error('HTML 文件为空');
			}
			return content;
		}
	} catch (e: any) {
		// 文件不存在或无法读取，当作 HTML 文本处理
		if (e.code !== 'ENOENT' && !e.message.includes('HTML 文件为空')) {
			// 其他错误也当作 HTML 文本
		}
	}

	// 作为 HTML 文本处理
	if (!htmlInput || !htmlInput.trim()) {
		throw new Error('HTML 内容不能为空');
	}

	return htmlInput;
}

