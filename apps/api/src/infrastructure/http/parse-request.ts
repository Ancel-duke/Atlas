import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";
import { ZodError } from "zod";

export function parseRequest<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown
): z.infer<TSchema> {
  try {
    const parsed = schema.parse(value) as z.infer<TSchema>;
    return parsed;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Request validation failed.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    throw error;
  }
}
