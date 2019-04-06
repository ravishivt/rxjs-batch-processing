import {
  BatchProcessingOptions,
  defaultBatchProcessingOptions,
  retrieveCompanies,
  retrieveCompanyOrders,
  sendBulkEmails,
} from "../utils";

export const approach1AsyncAwait = async (options?: BatchProcessingOptions) => {
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
    for (const company of curBatch) {
      company.orders = await retrieveCompanyOrders(company);
    }
    await sendBulkEmails(curBatch);
  }
};
