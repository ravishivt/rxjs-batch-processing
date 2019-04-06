import { approach1AsyncAwait } from "./approaches/1-asyncAwait";
import { approach2PromiseAll } from "./approaches/2-promiseAll";
import { approach3Observable } from "./approaches/3-observable";
import { approach4ObservableImproved } from "./approaches/4-observableImproved";
import { benchmark } from "./utils";

const evaluateOptions = async () => {
  const avg1 = await benchmark("1-AsyncAwait", approach1AsyncAwait, 3);
  const avg2 = await benchmark("2-PromiseAll", approach2PromiseAll, 3);
  const avg3 = await benchmark("3-Observable", approach3Observable, 3);
  const avg4 = await benchmark(
    "4-ObservableImproved",
    approach4ObservableImproved,
    3,
  );
  console.log(`2 vs 1 speed-up: ${(avg1 / avg2).toFixed(2)}x`);
  console.log(`3 vs 2 speed-up: ${(avg2 / avg3).toFixed(2)}x`);
  console.log(`4 vs 1 speed-up: ${(avg1 / avg4).toFixed(2)}x`);
  console.log(`4 vs 2 speed-up: ${(avg2 / avg4).toFixed(2)}x`);
};

evaluateOptions();
