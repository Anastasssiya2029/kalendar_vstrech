import { z } from 'zod';
import { insertMeetingSchema, meetings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  meetings: {
    list: {
      method: 'GET' as const,
      path: '/api/meetings' as const,
      responses: {
        200: z.array(z.custom<typeof meetings.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/meetings/:id' as const,
      responses: {
        200: z.custom<typeof meetings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/meetings' as const,
      input: insertMeetingSchema,
      responses: {
        201: z.custom<typeof meetings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/meetings/:id' as const,
      input: insertMeetingSchema.partial(),
      responses: {
        200: z.custom<typeof meetings.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/meetings/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type MeetingInput = z.infer<typeof api.meetings.create.input>;
export type MeetingUpdateInput = z.infer<typeof api.meetings.update.input>;
export type MeetingResponse = z.infer<typeof api.meetings.create.responses[201]>;
export type MeetingsListResponse = z.infer<typeof api.meetings.list.responses[200]>;
