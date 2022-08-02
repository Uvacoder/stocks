import type { GetServerSidePropsContext, NextPage } from "next";
import dynamic from "next/dynamic";
import { trpc } from "../utils/trpc";
import React from "react";
import { getAuthSession } from "~/server/common/get-server-session";
import loader from "~/assets/loader.svg";
import Image from "next/future/image";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const session = await getAuthSession(ctx);
  if (!session) {
    return { redirect: { destination: "/auth/signin", permanent: false } };
  }
  return { props: {} };
};

const LazyStockHistoryChart = dynamic(
  async () => (await import("../components/StockHistoryChart")).StockHistoryChart,
  {
    ssr: false, // chart is buggy when rendered on server
  }
);

const Spinner = () => (
  <Image src={loader} height={200} width={200} alt="Loading..." />
);

const PossesionView: React.FC<{
  possesion: any;
  startDate: Date;
  endDate: Date;
}> = ({ possesion, startDate, endDate }) => {
  const ticker = possesion.stock;
  const { data: stockHistory, isLoading: isLoadingStockHistory } =
    trpc.proxy.stocks.getByAuthedUser.useQuery({
      ticker,
      startDate,
      endDate,
    });

  const { data: transactions, isLoading: isLoadingTransactions } =
    trpc.proxy.transactions.getByAuthedUser.useQuery({ ticker });

  if (isLoadingStockHistory) return <Spinner />;
  return (
    <React.Suspense fallback={<Spinner />}>
      <div className="card h-[40vh] bg-base-200 rounded-box place-items-center">
        <h1 className="py-2">{ticker}</h1>
        {!stockHistory ? (
          <Spinner />
        ) : (
          <LazyStockHistoryChart
            stockHistory={stockHistory}
            transactions={transactions}
          />
        )}
      </div>
    </React.Suspense>
  );
};

const StocksPage: NextPage = () => {
  const ticker = "TSLA";
  const startDate = new Date("2022-04-01");
  const endDate = React.useMemo(() => new Date(), []);

  const { data: userPossesion, isLoading: isLoadingPossesion } =
    trpc.proxy.possesion.getByAuthedUser.useQuery();

  if (isLoadingPossesion) return <Spinner />;

  return (
    <div className="flex flex-col mt-10 gap-10">
      {userPossesion?.map((possesion) => (
        <PossesionView
          key={possesion.id}
          possesion={possesion}
          startDate={startDate}
          endDate={endDate}
        />
      ))}
    </div>
  );
};

export default StocksPage;
