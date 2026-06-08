export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: PaginationMeta;
}

export const successResponse = <T>(
  data: T,
  message = "Operation completed successfully",
): SuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export const errorResponse = (
  message: string,
  code: string,
  details?: unknown,
): ErrorResponse => ({
  success: false,
  message,
  error: {
    code,
    ...(details === undefined ? {} : { details }),
  },
});

export const paginatedResponse = <T>(
  data: T[],
  meta: Omit<PaginationMeta, "totalPages">,
  message = "Data retrieved successfully",
): PaginatedResponse<T> => ({
  success: true,
  message,
  data,
  meta: {
    ...meta,
    totalPages: Math.ceil(meta.total / meta.limit),
  },
});
