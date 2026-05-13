import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("FoodTrace", (m) => {
  const foodTrace = m.contract("FoodTrace");
  return { foodTrace };
});
