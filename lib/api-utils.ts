import { NextResponse } from "next/server";

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function handleError(error: unknown) {
  console.error(error);
  
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, data: error.data },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "An unexpected error occurred" },
    { status: 500 }
  );
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
} 