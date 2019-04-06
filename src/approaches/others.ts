import { BehaviorSubject, empty, from, of } from "rxjs";
import { bufferTime, catchError, mergeMap, scan } from "rxjs/operators";
import {
  BatchProcessingOptions,
  defaultBatchProcessingOptions,
  retrieveCompanies,
  retrieveCompanyOrders,
  sendBulkEmails,
} from "../utils";

export const processAllCompaniesObservable = async (options?: {
  batchSize?: number;
  maxConcurrency?: number;
}) => {
  const paginationOptions = {
    batchSize: 4,
    maxConcurrency: 5,
    ...options,
  };
  const controller$ = new BehaviorSubject(0);
  let receivedCount = 0;

  return controller$
    .pipe(
      mergeMap(curOffset =>
        retrieveCompanies(paginationOptions.batchSize, curOffset),
      ),
      mergeMap(companies => {
        console.log("received", companies.length);
        receivedCount += companies.length;
        if (companies.length === 0) {
          controller$.complete();
        }
        return from(companies);
      }),
      mergeMap(
        async company => {
          // console.log('retrieving file details', file.fileName);
          const orders = await retrieveCompanyOrders(company);
          // console.log(company.id, company.name, orders[0]);
          company.orders = orders;
          return company;
        },
        undefined,
        paginationOptions.maxConcurrency,
      ),
      scan(
        (acc: any, company) => {
          acc.processedCount++;
          console.log(
            "received batch",
            company.id,
            acc.companyCount,
            "offset",
            acc.curOffset,
          );
          if (receivedCount === acc.processedCount) {
            acc.curOffset += paginationOptions.batchSize;
            controller$.next(acc.curOffset);
          }
          return acc;
        },
        {
          curOffset: 0,
          processedCount: 0,
        },
      ),
      catchError(async err => {
        console.log("err", err);
        return err;
      }),
    )
    .toPromise();
};

export const approach31Observable = async (
  options?: BatchProcessingOptions,
) => {
  options = {
    ...defaultBatchProcessingOptions,
    ...options,
  };
  const controller$ = new BehaviorSubject(0);
  let curBatchReceivedCount = 0;

  return controller$
    .pipe(
      mergeMap(
        curOffset => retrieveCompanies(options.batchSize, curOffset),
        undefined,
        1,
      ),
      mergeMap(companies => {
        // console.log("received", companies.length);
        curBatchReceivedCount = companies.length;
        if (companies.length === 0) {
          controller$.complete();
        }
        return from(companies);
      }),
      mergeMap(
        async company => {
          // console.log('retrieving file details', file.fileName);
          company.orders = await retrieveCompanyOrders(company);
          // console.log(company.id, company.name, orders[0]);
          // company.orders = orders;
          return company;
        },
        undefined,
        options.retrieveOrdersConcurrency,
      ),
      bufferTime(500, undefined, options.batchSize),
      mergeMap(companies => {
        return companies.length > 0 ? of(companies) : empty();
      }),
      mergeMap(
        async companies => {
          await sendBulkEmails(companies);
          // console.log('sent emails', companies.map(company => company.id));
          return companies;
        },
        undefined,
        5,
      ),
      scan(
        (acc: any, companies) => {
          acc.curBatchProcessedCount += companies.length;
          if (acc.curBatchProcessedCount === curBatchReceivedCount) {
            acc.curBatchProcessedCount = 0;
            acc.curOffset += options.batchSize;
            controller$.next(acc.curOffset);
          }
          return acc;
        },
        {
          curOffset: 0,
          curBatchProcessedCount: 0,
        },
      ),
      catchError(async err => {
        console.log("err", err);
        return err;
      }),
    )
    .toPromise();
};
