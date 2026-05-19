import 'server-only';

type D1QueryResponse<T> = {
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    result: Array<{
        success: boolean;
        results: T[];
        meta?: { rows_read?: number; rows_written?: number };
    }>;
};

export type D1ClientConfig = {
    accountId: string;
    databaseId: string;
    apiToken: string;
};

export class D1Client {
    private readonly endpoint: string;
    private readonly authHeader: string;

    constructor({ accountId, databaseId, apiToken }: D1ClientConfig) {
        this.endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
        this.authHeader = `Bearer ${apiToken}`;
    }

    async query<T>(sql: string, params: Array<string | number | null> = []): Promise<T[]> {
        const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql, params }),
        });

        if (!res.ok) {
            const body = await res.text();

            throw new Error(`D1 HTTP ${res.status}: ${body}`);
        }

        const data = (await res.json()) as D1QueryResponse<T>;

        if (!data.success) {
            const errs = data.errors.map((e) => `[${e.code}] ${e.message}`).join('; ');

            throw new Error(`D1 query failed: ${errs}`);
        }

        return data.result[0]?.results ?? [];
    }
}
