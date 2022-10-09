import { TRPCError } from "@trpc/server";
import { isDate } from "date-fns";
import { z } from "zod";

import { getNextBusinessDay } from "~/utils/dateFnsHelpers";

import { authedProcedure, createRouter } from "../../trpc";

export const createTransactionValidator = z.object({
  transactedAt: z.preprocess((dateString) => {
    const asDate = new Date(dateString as string);
    if (!isDate(asDate)) {
      return false;
    }
    return getNextBusinessDay(asDate);
  }, z.date()),
  stock: z.string().min(1).max(6),
  units: z.number().int().positive(),
  pricePerUnit: z.number().positive(),
  type: z.enum(["BUY", "SELL"]),
});

export const transactionRouter = createRouter({
  getByAuthedUser: authedProcedure
    .input(z.object({ ticker: z.string() }).nullish())
    .query(async ({ ctx, input }) => {
      if (input) {
        return await ctx.prisma.transaction.findMany({
          where: { stock: input.ticker },
          orderBy: {
            transactedAt: "desc",
          },
        });
      }
      return await ctx.prisma.transaction.findMany({
        orderBy: {
          transactedAt: "desc",
        },
      });
    }),
  delete: authedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.transaction.delete({
        where: {
          id: input.id,
        },
      });
    }),
  create: authedProcedure
    .input(createTransactionValidator)
    .mutation(async ({ input, ctx }) => {
      const currentAmount = await ctx.prisma.possesion.findFirst({
        select: { amount: true, id: true },
        where: {
          userId: ctx.session.user.id,
          stock: input.stock,
        },
      });

      console.log(currentAmount);

      if (input.type === "SELL") {
        if (!currentAmount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You don't own this stock and therefore can't sell any.",
          });
        }
        if (currentAmount.amount < input.units) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You don't own ${input.units} of this stock.`,
          });
        }
        await ctx.prisma.possesion.update({
          where: {
            id: currentAmount.id,
          },
          data: {
            amount: currentAmount.amount - input.units,
          },
        });
      } else {
        if (currentAmount) {
          await ctx.prisma.possesion.update({
            where: {
              id: currentAmount.id,
            },
            data: {
              amount: currentAmount.amount + input.units,
            },
          });
        } else {
          await ctx.prisma.possesion.create({
            data: {
              userId: ctx.session.user.id,
              stock: input.stock,
              amount: input.units,
            },
          });
        }
      }

      return await ctx.prisma.transaction.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),
});
