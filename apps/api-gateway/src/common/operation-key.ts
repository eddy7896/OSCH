/** Same formula for the OpenAPI operationId and the route table, so the two can be joined. */
export const operationKey = (controller: string, method: string) => `${controller.replace(/Controller$/, '')}_${method}`;
