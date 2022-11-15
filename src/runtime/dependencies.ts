export interface WithTelemetry {
  captureException(error: unknown): void;
  captureAsyncFunction<R>(
    name: string,
    attributes: Record<string, boolean | number | string | undefined>,
    fn: () => Promise<R>
  ): Promise<R>;
}
