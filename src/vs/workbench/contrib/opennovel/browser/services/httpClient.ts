/*---------------------------------------------------------------------------------------------
 *  Copyright (c) OpenNovel IDE. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from 'vs/platform/log/common/log';

export interface HttpRequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	headers?: Record<string, string>;
	body?: string | object;
	timeout?: number;
	retries?: number;
}

export interface HttpResponse<T = unknown> {
	ok: boolean;
	status: number;
	data: T;
	headers: Headers;
}

export class HttpClient {
	private readonly defaultTimeout = 30000;
	private readonly defaultRetries = 2;

	constructor(
		private readonly baseUrl: string,
		@ILogService private readonly logService: ILogService
	) { }

	async request<T = unknown>(path: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
		const {
			method = 'GET',
			headers = {},
			body,
			timeout = this.defaultTimeout,
			retries = this.defaultRetries
		} = options;

		const url = `${this.baseUrl}${path}`;
		const requestBody = typeof body === 'object' ? JSON.stringify(body) : body;

		const requestHeaders: Record<string, string> = {
			'Content-Type': 'application/json',
			...headers
		};

		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);

				const response = await fetch(url, {
					method,
					headers: requestHeaders,
					body: requestBody,
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				const responseText = await response.text();
				let data: T;

				try {
					data = JSON.parse(responseText) as T;
				} catch {
					data = responseText as unknown as T;
				}

				return {
					ok: response.ok,
					status: response.status,
					data,
					headers: response.headers
				};
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logService.warn(`[HttpClient] Request failed (attempt ${attempt + 1}/${retries + 1}):`, lastError.message);

				if (attempt < retries) {
					await this.delay(1000 * (attempt + 1));
				}
			}
		}

		throw lastError || new Error('Request failed after retries');
	}

	async get<T = unknown>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
		return this.request<T>(path, { ...options, method: 'GET' });
	}

	async post<T = unknown>(path: string, body?: object, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
		return this.request<T>(path, { ...options, method: 'POST', body });
	}

	async put<T = unknown>(path: string, body?: object, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
		return this.request<T>(path, { ...options, method: 'PUT', body });
	}

	async delete<T = unknown>(path: string, options?: Omit<HttpRequestOptions, 'method'>): Promise<HttpResponse<T>> {
		return this.request<T>(path, { ...options, method: 'DELETE' });
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}