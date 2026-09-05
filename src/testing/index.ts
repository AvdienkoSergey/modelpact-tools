/**
 * `modelpact-tools/testing`: the tool contract, run against any tool.
 *
 * A separate entry because it calls `describe` and `test`, and `vitest` is an
 * optional peer dependency — an app that only calls tools never loads this.
 */
export {
  describeKitContract,
  describeToolContract,
  type KitContractOptions,
} from "./contract.js";
