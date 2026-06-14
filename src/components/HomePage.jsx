import styles from './HomePage.module.css'

const CAPABILITIES = [
  '语音绘图',
  '结构化图元',
  '对象级编辑',
  '长语音模式',
  '属性面板',
  'PNG / SVG 导出',
]

const WORKFLOW = [
  { title: '说出画面', detail: '“画一座带红色屋顶的小房子”' },
  { title: '编译命令', detail: 'AI 转换为 circle / rect / line / text' },
  { title: '逐步绘制', detail: '画布按步骤生成可编辑对象' },
  { title: '继续编辑', detail: '查看房子门的属性，修改颜色与透明度' },
  { title: '导出作品', detail: '保存为 PNG 或 SVG' },
]

const FEATURE_CARDS = [
  {
    title: '语音输入',
    label: '语音指令',
    content: '画一座带红色屋顶的小房子',
  },
  {
    title: '结构化命令',
    label: '场景编译',
    content: 'circle / rect / line / text / update',
  },
  {
    title: '对象级编辑',
    label: '可编辑对象',
    content: '查看房子门的属性',
  },
  {
    title: '导出作品',
    label: '作品导出',
    content: 'PNG / SVG',
  },
]

export default function HomePage({ onStart }) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>AI</span>
          <span>AI 语音绘图</span>
        </div>
        <nav className={styles.links} aria-label="页面导航">
          <a href="#product">产品</a>
          <a href="#demo">演示</a>
          <button type="button" onClick={onStart}>画布</button>
        </nav>
      </header>

      <main className={styles.hero} id="product">
        <section className={styles.copy}>
          <div className={styles.kicker}>
            <span>AI 设计工具</span>
            <span>可编辑矢量画布</span>
          </div>
          <h1>AI 语音绘图</h1>
          <p className={styles.subtitle}>用语音创作，可继续编辑的矢量画布</p>
          <p className={styles.lead}>
            不是一次性 AI 生图，而是可选择、可修改、可撤销、可导出的对象级画布。
          </p>
          <div className={styles.actions}>
            <button className={styles.primaryAction} type="button" onClick={onStart}>
              开始创作
            </button>
            <a className={styles.secondaryAction} href="#demo">
              查看演示脚本
            </a>
          </div>
          <div className={styles.capabilities}>
            {CAPABILITIES.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className={styles.productPanel} aria-label="产品能力">
          <div className={styles.panelHeader}>
            <span>语音工作流</span>
            <strong>从描述到可编辑对象</strong>
          </div>
          <ol className={styles.workflow}>
            {WORKFLOW.map((item, index) => (
              <li key={item.title}>
                <span className={styles.stepIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.featureGrid}>
            {FEATURE_CARDS.map((card) => (
              <article key={card.title} className={styles.featureCard}>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.content}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <section className={styles.demo} id="demo" aria-label="演示脚本">
        <div>
          <span className={styles.sectionLabel}>推荐演示</span>
          <h2>用一段流程展示项目核心价值</h2>
        </div>
        <ol>
          {WORKFLOW.map((step) => (
            <li key={step.title}>{step.detail}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
