// 错误信息翻译工具：将合约/ethers.js 英文错误映射为中文提示
// 在 Vue 组件 catch 块中调用 translateError(err) 即可获得用户友好的中文消息

// 错误关键词 → 中文提示 映射表（按匹配优先级排序）
const errorMap = [
  {
    key: "Caller is not a producer",
    msg: "此地址非生产商地址，无注册新产品或添加溯源记录权限",
  },
  {
    key: "You are not the producer",
    msg: "您不是该产品的注册生产商，无权添加溯源记录",
  },
  { key: "Product does not exist", msg: "该产品不存在，请检查产品ID是否正确" },
  { key: "Product name cannot be empty", msg: "产品名称不能为空" },
  {
    key: "Product name already exists",
    msg: "该产品名称已被注册，不可使用相同名称",
  },
  { key: "Invalid address", msg: "无效的以太坊地址，请检查地址格式" },
  { key: "Already a producer", msg: "该地址已是生产商，无需重复添加" },
  { key: "Not a producer", msg: "该地址不是生产商，无法移除" },
  { key: "Record must have", msg: "溯源记录必须包含环节描述" },
  {
    key: "Duplicate record description",
    msg: "该产品已存在相同环节描述，不可重复添加",
  },
  {
    key: "OwnableUnauthorizedAccount",
    msg: "只有合约管理员（owner）才能执行此操作",
  },
  {
    key: "Failed to fetch",
    msg: "网络连接失败，请确保 Ganache 已启动（端口 8545）",
  },
  { key: "eth_requestAccounts", msg: "请在 MetaMask 中授权连接钱包" },
  { key: "user rejected", msg: "您在 MetaMask 中拒绝了该交易" },
  { key: "insufficient funds", msg: "账户余额不足，无法支付 Gas 费" },
  {
    key: "nonce too low",
    msg: "交易 Nonce 冲突，请在 MetaMask 中重置账户（设置→高级→重置账户）",
  },
  {
    key: "operation was aborted",
    msg: "交易被中断，请在 MetaMask 中重置账户（设置→高级→重置账户）",
  },
  { key: "missing revert data", msg: "合约执行异常，可能是权限不足或参数无效" },
  {
    key: "Internal JSON-RPC error",
    msg: "合约执行失败，请检查您的权限和输入参数",
  },
  {
    key: "ECONNREFUSED",
    msg: "无法连接到 Ganache（127.0.0.1:8545），请先启动 Ganache",
  },
  {
    key: "could not coalesce error",
    msg: "钱包网络异常，请在 MetaMask 中切换到 Ganache 网络（127.0.0.1:8545，链ID 31337）",
  },
];

// 将原始错误对象或字符串翻译为用户友好的中文消息
export function translateError(error) {
  const message =
    typeof error === "string" ? error : error?.message || String(error);

  for (const entry of errorMap) {
    if (message.includes(entry.key)) {
      return entry.msg;
    }
  }

  // 兜底：Revert 错误通常带有 reason 字段
  if (error?.reason) {
    for (const entry of errorMap) {
      if (error.reason.includes(entry.key)) {
        return entry.msg;
      }
    }
  }

  // 最终兜底
  return "操作失败，请查看控制台获取详细信息";
}
