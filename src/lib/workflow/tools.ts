
export const TOOL_DEFINITIONS = [
  {
    id: 'dipca.scale',
    name: { en: 'DiPCA Scale', zh: 'DiPCA 标准化' },
    description: {
      en: 'Standardize and normalize source data to stabilize DiPCA latent factors and variance structure.',
      zh: '标准化与归一化源数据，稳定 DiPCA 隐含因子与方差结构。'
    },
    category: 'data'
  },
  {
    id: 'dipca.fit',
    name: { en: 'DiPCA Fit', zh: 'DiPCA 训练' },
    description: {
      en: 'Train the DiPCA model, fitting latent components and producing monitoring statistics.',
      zh: '训练 DiPCA 模型，拟合潜在成分并生成监控统计量。'
    },
    category: 'analysis'
  },
  {
    id: 'dipca.deflation',
    name: { en: 'DiPCA Deflation', zh: 'DiPCA Deflation' },
    description: {
      en: 'Perform iterative deflation to extract vk/xr loadings for downstream reconstruction analysis.',
      zh: '执行迭代去除以提取 vk/xr 载荷，用于后续重构分析。'
    },
    category: 'analysis'
  },
  {
    id: 'dipca.limits',
    name: { en: 'DiPCA Limits', zh: 'DiPCA 控制限' },
    description: {
      en: 'Derive Phi statistics and adaptive control limits for online process monitoring.',
      zh: '推导 Phi 统计量与自适应控制限，用于在线过程监控。'
    },
    category: 'analysis'
  },
  {
    id: 'dipca.index',
    name: { en: 'DiPCA Index', zh: 'DiPCA 统计量' },
    description: {
      en: 'Compute v/r/e indices capturing variance, reconstruction quality, and residual contributions.',
      zh: '计算 v/r/e 指标，以刻画方差、重构质量与残差贡献。'
    },
    category: 'analysis'
  },
  {
    id: 'dipca.plot',
    name: { en: 'DiPCA Plot', zh: 'DiPCA 绘图' },
    description: {
      en: 'Render DiPCA monitoring charts (scores, loadings, residuals) for diagnostics and reporting.',
      zh: '绘制 DiPCA 监控图表（得分、载荷、残差），支持诊断与展示。'
    },
    category: 'utility'
  },
] as const;

export const CATEGORY_LABELS = {
  math: { en: 'Math', zh: '数学' },
  data: { en: 'Data', zh: '数据' },
  analysis: { en: 'Analysis', zh: '分析' },
  utility: { en: 'Utility', zh: '工具' }
} as const;
