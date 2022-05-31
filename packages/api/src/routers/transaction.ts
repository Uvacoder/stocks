import { createRouter } from "../create-router";
import { z } from "zod";
import { createTransactionValidator } from "../validators/transaction";

export const transactionRouter = createRouter()
  .query("getAll", {
    async resolve({ ctx }) {
      return await ctx.prisma.transaction.findMany({
        orderBy: {
          transactedAt: "desc",
        },
      });
    },
  })
  .query("getById", {
    input: z.object({
      id: z.string().uuid(),
    }),
    async resolve({ input, ctx }) {
      return await ctx.prisma.transaction.findFirst({
        where: {
          ...input,
        },
      });
    },
  })
  .query("getByUserId", {
    input: z.object({
      id: z.string().uuid(),
    }),
    async resolve({ input, ctx }) {
      return await ctx.prisma.user.findMany({
        where: {
          ...input,
        },
        include: {
          transactions: true,
        },
      });
    },
  })
  .mutation("create", {
    input: createTransactionValidator,
    async resolve({ input, ctx }) {
      return await ctx.prisma.transaction.create({
        data: {
          ...input,
          transactedBy: {
            connect: {
              id: input.transactedBy,
            },
          },
        },
      });
    },
  });
