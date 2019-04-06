import {
  BatchProcessingOptions,
  defaultBatchProcessingOptions,
  retrieveCompanies,
  retrieveCompanyOrders,
  sendBulkEmails,
} from "../utils";

export const approach2PromiseAll = async (options?: BatchProcessingOptions) => {
  options = {
    ...defaultBatchProcessingOptions,
    ...options,
  };
  for (
    let curOffset = 0;
    curOffset < Infinity;
    curOffset += options.batchSize
  ) {
    const curBatch = await retrieveCompanies(options.batchSize, curOffset);
    if (curBatch.length === 0) {
      break;
    }
    await Promise.all(
      curBatch.map(async company => {
        company.orders = await retrieveCompanyOrders(company);
      }),
    );
    await sendBulkEmails(curBatch);
  }
};
