import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .default('1d')
    .refine(
      (val) => {
        const match = /^(\d+)([smhd])$/.exec(val);
        if (!match) return false;
        const amount = Number(match[1]);
        const unit = match[2];
        if (unit === 's') return amount <= 86400;
        if (unit === 'm') return amount <= 1440;
        if (unit === 'h') return amount <= 24;
        if (unit === 'd') return amount <= 1;
        return false;
      },
      { message: 'JWT_REFRESH_EXPIRES_IN must not exceed 1 day (e.g. 1d, 24h)' },
    ),
  CORS_ORIGIN: z.string().default('*'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return environmentSchema.parse(config);
}
