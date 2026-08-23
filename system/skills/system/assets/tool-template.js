export default {
  name: "example_tool",
  description: "Describe the operation and any material side effects",
  inputSchema: {
    type: "object",
    properties: {
      value: { type: "string", minLength: 1, maxLength: 1000 },
    },
    required: ["value"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      value: { type: "string" },
    },
    required: ["id", "value"],
    additionalProperties: false,
  },
  capabilities: {},
  handler: async (input, ctx) => {
    const id = crypto.randomUUID();
    const record = { id, value: input.value };
    await ctx.storage.put(`example:${id}`, record);
    return record;
  },
};
