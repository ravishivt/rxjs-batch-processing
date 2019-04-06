import { BehaviorSubject, from } from "rxjs";
import { catchError, mergeMap, mergeScan } from "rxjs/operators";
import {
  BatchProcessingOptions,
  defaultBatchProcessingOptions,
  retrieveCompanies,
  retrieveCompanyOrders,
  sendBulkEmails,
  validateBatchProcessingOptions,
} from "../utils";

export const approach3Observable = async (options?: BatchProcessingOptions) => {
  options = {
    ...defaultBatchProcessingOptions,
    ...options,
  };
  validateBatchProcessingOptions(options);
  let curBatchReceivedCount = 0;
  // Start the iteration with an offset of 0.
  const controller$ = new BehaviorSubject(0);

  return controller$
    .pipe(
      /**
       * Fetch the next batch of data (the batchSize number of records
       *   after the current offset).
       */
      mergeMap(
        curOffset => retrieveCompanies(options.batchSize, curOffset),
        undefined,
        options.retrieveCompaniesConcurrency,
      ),
      /**
       * Flatten the array of fetched companies into individual company records.
       * The proceeding observable operators will therefore work on the individual companies.
       * Break the iteration if the fetched data is empty.
       */
      mergeMap(companies => {
        curBatchReceivedCount = companies.length;
        if (companies.length === 0) {
          controller$.complete();
        }
        return from(companies);
      }),
      // Retrieve each company's orders concurrently.
      mergeMap(
        async company => {
          company.orders = await retrieveCompanyOrders(company);
          return company;
        },
        undefined,
        options.retrieveOrdersConcurrency,
      ),
      /**
       * Accumulate the companies processed for the current batch.
       * When the entire batch has been processed,
       *  send the bulk emails and proceed to the next batch.
       */
      mergeScan(
        async (acc: any, company) => {
          acc.curBatchProcessed.push(company);
          /**
           * We can't compare with `batchSize` since we may not get a full batch of data.
           * e.g. If there's only 5 total companies and our `batchSize` is 3,
           * the last set will only contain 2 companies (`companies[3-4]`).
           */
          if (acc.curBatchProcessed.length === curBatchReceivedCount) {
            await sendBulkEmails(acc.curBatchProcessed);
            acc.curBatchProcessed = [];
            acc.curOffset += options.batchSize;
            controller$.next(acc.curOffset);
          }
          return acc;
        },
        {
          curBatchProcessed: [],
          curOffset: 0,
        },
        1,
      ),
      catchError(async err => {
        console.log("err", err);
        return err;
      }),
    )
    .toPromise();
};
