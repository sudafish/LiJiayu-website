const card = document.querySelector(".omikuji-card");
const menuButton = document.querySelector(".menu-button");
const menuOverlay = document.querySelector(".menu-overlay");
const menuLinks = document.querySelectorAll(".menu-links a");
const languageButtons = Array.from(document.querySelectorAll(".language-switch button"));
const aboutPage = document.querySelector(".about-page");
const contactPage = document.querySelector(".contact-page");
const worksPage = document.querySelector(".works-page");
const workDetailPages = Array.from(document.querySelectorAll(".work-detail-page"));
const worksBoard = document.querySelector(".works-board");
const worksItems = Array.from(document.querySelectorAll(".work-item"));
const blurWorksItems = Array.from(document.querySelectorAll(".more-work-item"));
const blurWorksImages = blurWorksItems.map((item) => item.querySelector("img"));
const staticWorksImages = Array.from(document.querySelectorAll(".work-item img"));
const worksFilterLinks = Array.from(document.querySelectorAll(".works-filter a"));
const worksProjectList = document.querySelector(".works-project-list");
const worksProjectListItems = Array.from(document.querySelectorAll(".works-project-list span"));
const worksProjectNote = document.querySelector(".works-project-note");
const networkCanvas = document.getElementById("network-background-canvas");
const layoutWidth = 1440;
const layoutHeight = 900;
const maxWorksBlur = 8;

let lastSelected = "";
let siteScale = 1;
let drawTimer = 0;
let worksBlurFrame = 0;
let worksScrollCorrection = 0;
let worksActiveHoldTimer = 0;
let programmaticWorksFocusIndex = -1;
let heldWorksSection = "";
let enabledWorksDetailsSection = "";
let renderedWorksSection = "";
let renderedWorksProjectSection = "";
let renderedWorksFocusIndex = -2;
let resizeFrame = 0;
let lineHeroTransitionClone = null;
let lineHeroTransitionTimer = 0;
let lineHeroTransitionFrame = 0;
let lineHeroTransitionDebug = null;
let wasHomeRoute = !window.location.hash || window.location.hash === "#";
let wasWorksRoute = window.location.hash === "#works";
let wasAboutRoute = false;
let wasContactRoute = false;
let detailScaleFrame = 0;
let detailTextSqueezeFrame = 0;
let detailTextSqueezeTimer = 0;
let isDetailTextSqueezed = false;
const textMeasureCanvas = document.createElement("canvas");
const textMeasureContext = textMeasureCanvas.getContext("2d");

const updateWorkDetailScaleMargins = () => {
  detailScaleFrame = 0;
  document.querySelectorAll(".work-detail-scale").forEach((frame) => {
    const layoutHeight = frame.scrollHeight;
    const visualHeight = frame.getBoundingClientRect().height / siteScale;
    const compensation = Math.min(0, visualHeight - layoutHeight);
    frame.style.setProperty("--detail-scale-margin", `${compensation}px`);
  });
};

const requestWorkDetailScaleMarginUpdate = () => {
  if (detailScaleFrame) return;
  detailScaleFrame = window.requestAnimationFrame(updateWorkDetailScaleMargins);
};

const getTextSegmentsAroundBreaks = (paragraph) => {
  const segments = [];
  let segment = "";
  paragraph.childNodes.forEach((node) => {
    if (node.nodeName === "BR") {
      segments.push(segment.trim());
      segment = "";
      return;
    }
    segment += node.textContent || "";
  });
  if (segment.trim()) segments.push(segment.trim());
  return segments;
};

const updateWorkDetailTextSqueeze = () => {
  detailTextSqueezeFrame = 0;
  let maxOverflow = Number.NEGATIVE_INFINITY;
  const activePage = workDetailPages.find((page) => getComputedStyle(page).display !== "none");
  const canSqueezeText = document.documentElement.classList.contains("is-compact-layout");
  document.documentElement.classList.remove("is-detail-text-squeezed");

  if (canSqueezeText && activePage && document.body.classList.contains("is-work-detail") && textMeasureContext) {
    const paragraphs = Array.from(activePage.querySelectorAll(".work-detail-scale p")).filter(
      (paragraph) => paragraph.querySelector("br") && !paragraph.classList.contains("line-detail-tools"),
    );

    paragraphs.forEach((paragraph) => {
      const width = paragraph.parentElement?.clientWidth || paragraph.clientWidth;
      if (width <= 0) return;
      const style = getComputedStyle(paragraph);
      textMeasureContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      getTextSegmentsAroundBreaks(paragraph).forEach((segment) => {
        maxOverflow = Math.max(maxOverflow, textMeasureContext.measureText(segment).width - width);
      });
    });
  }

  const squeezed = canSqueezeText && maxOverflow > -4;
  isDetailTextSqueezed = squeezed;
  const changed = document.documentElement.classList.toggle("is-detail-text-squeezed", squeezed);
  if (changed) requestWorkDetailScaleMarginUpdate();
};

const requestWorkDetailTextSqueezeUpdate = (delay = 0) => {
  if (detailTextSqueezeTimer) {
    window.clearTimeout(detailTextSqueezeTimer);
    detailTextSqueezeTimer = 0;
  }

  if (delay > 0) {
    detailTextSqueezeTimer = window.setTimeout(() => {
      detailTextSqueezeTimer = 0;
      requestWorkDetailTextSqueezeUpdate();
    }, delay);
    return;
  }

  if (detailTextSqueezeFrame) return;
  detailTextSqueezeFrame = window.requestAnimationFrame(updateWorkDetailTextSqueeze);
};

const getActiveScrollContainer = () => {
  if (document.body.classList.contains("is-menu-open")) return null;
  if (document.body.classList.contains("is-works")) return worksPage;
  if (document.body.classList.contains("is-about")) return aboutPage;
  if (document.body.classList.contains("is-contact")) return contactPage;
  if (document.body.classList.contains("is-work-detail")) {
    return workDetailPages.find((page) => getComputedStyle(page).display !== "none") || null;
  }
  return null;
};

const forwardWheelToActivePage = (event) => {
  if (event.ctrlKey || event.metaKey) return;
  if (event.target.closest?.(".video-modal")) return;
  const activeScrollContainer = getActiveScrollContainer();
  if (!activeScrollContainer) return;
  event.preventDefault();
  activeScrollContainer.scrollBy({
    top: event.deltaY,
    left: event.deltaX,
    behavior: "auto",
  });
};

const setupWorkDetailScaleFrames = () => {
  document.querySelectorAll(".work-detail-page").forEach((page) => {
    if (page.querySelector(":scope > .work-detail-scale")) return;
    const frame = document.createElement("div");
    frame.className = "work-detail-scale";
    const content = Array.from(page.children).filter((child) => !child.classList.contains("work-detail-back"));
    if (!content.length) return;
    page.insertBefore(frame, content[0]);
    content.forEach((child) => frame.appendChild(child));
    frame.querySelectorAll("img").forEach((image) => {
      image.addEventListener("load", requestWorkDetailScaleMarginUpdate, { once: true });
    });
  });
  requestWorkDetailScaleMarginUpdate();
};

setupWorkDetailScaleFrames();

const setupPageCopyrightFooters = () => {
  document.querySelectorAll(".works-page, .about-page, .contact-page, .work-detail-page").forEach((page) => {
    if (page.querySelector(":scope > .site-copyright")) return;
    const footer = document.createElement("footer");
    footer.className = "site-copyright";
    footer.setAttribute("aria-label", "Copyright");
    footer.textContent = "Copyright (c) LIJIAYU. All right Reserved.";
    page.appendChild(footer);
  });
};

setupPageCopyrightFooters();

const createVideoEmbedUrl = (url) => {
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&title=0&byline=0&portrait=0`;
  }
  return url;
};

const setupVideoModal = () => {
  const triggers = Array.from(document.querySelectorAll("[data-video-url]"));
  if (!triggers.length) return;

  const modal = document.createElement("div");
  modal.className = "video-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="video-modal-backdrop" data-video-close></div>
    <div class="video-modal-panel" role="dialog" aria-modal="true" aria-label="Video player">
      <button class="video-modal-close" type="button" aria-label="Close video" data-video-close><span></span><span></span></button>
      <iframe title="Video player" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
    </div>
  `;
  document.body.appendChild(modal);

  const iframe = modal.querySelector("iframe");
  const closeButton = modal.querySelector(".video-modal-close");

  const closeVideo = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modal.removeAttribute("data-video-ratio");
    iframe.removeAttribute("src");
  };

  const openVideo = (url, ratio = "") => {
    if (ratio) {
      modal.setAttribute("data-video-ratio", ratio);
    } else {
      modal.removeAttribute("data-video-ratio");
    }
    iframe.setAttribute("src", createVideoEmbedUrl(url));
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    closeButton.focus({ preventScroll: true });
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openVideo(trigger.dataset.videoUrl, trigger.dataset.videoRatio));
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openVideo(trigger.dataset.videoUrl, trigger.dataset.videoRatio);
    });
  });

  modal.querySelectorAll("[data-video-close]").forEach((button) => {
    button.addEventListener("click", closeVideo);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeVideo();
  });
};

setupVideoModal();

const syncWorkDetailCopyright = () => {
  workDetailPages.forEach((page) => {
    const isActiveDetail = document.body.classList.contains("is-work-detail") && getComputedStyle(page).display !== "none";
    const isAtEnd = page.scrollHeight - page.scrollTop - page.clientHeight <= 2;
    page.classList.toggle("is-detail-at-end", isActiveDetail && isAtEnd);
  });
};

const jaText = {
  "今日运势": "今日の運勢",
  "李佳瑜": "リカユ",
  "2001年，出生于中国深圳。": "2001年、中国・深セン生まれ。",
  "本科毕业于浙江理工大学，主修数字媒体艺术的交互设计方向。": "浙江理工大学でデジタルメディアアートを専攻し、インタラクションデザインを学ぶ。",
  "研究生就读于京都艺术大学，专攻影像领域。目前主要进行多感官互动的影像装置创作。": "現在は京都芸術大学大学院で映像領域を専攻し、\n主に多感覚的なインタラクティブ映像インスタレーションを制作している。",
  "实习/兼职经历": "インターン・アルバイト",
  "腾讯科技（深圳）有限公司": "Tencent Technology（深セン）有限公司",
  "于腾讯IEG虚拟偶像产品组，参与官方自媒体账号的内容制作，主要负责平面视觉设计与手绘创作，支持账号日常运营与视觉表达。参与IP的活动策划，协助完成活动创意、视觉物料与传播形式的设计。参与短视频、MV、音乐等制作的全流程，协助进行视频剪辑、素材收集与内容整理，提升多平台内容产出的完整度与效率。通过图文、视频、音乐等多元内容形式，丰富官方账号运营内容，提升虚拟偶像 IP 的传播力、内容多样性与粉丝粘性。": "IEGのバーチャルアイドルチームで、公式SNS向けのビジュアルデザインと手描きイラストを担当。IPイベントの企画補助、短尺動画・MV・音源制作にも携わり、素材収集や編集補助を行った。多様なコンテンツ制作を通して、IPの発信力とファンとの関係づくりに貢献した。",
  "产品策划实习": "プロダクト企画インターン",
  "东莞创基精密有限公司": "東莞創基精密有限公司",
  "辅助团队完成电子硬件产品设计相关任务，学习并使用 Photoshop、Creo、ProE 等设计工具，进行基础平面处理、产品效果调整与三维建模练习。通过参与实际项目，初步理解电子硬件产品从外观构思、结构建模到设计修改的基本流程。": "電子ハードウェア製品のデザイン補助を担当。Photoshop、Creo、ProEを使用し、画像処理、製品イメージの調整、3Dモデリングを行った。",
  "产品设计实习": "プロダクトデザインインターン",
  "粉丝官方应援站": "ファン公式応援サイト",
  "负责粉丝应援站相关视觉设计需求，包括周边物料、用于发布于SNS的长图、大屏广告等，并且在中国、韩国的商场、地铁站、公交站等线下公共空间实际投放。参与设计的盲盒等周边实现全部售罄，有效提升了粉丝参与度与社群粘性。": "ファン応援サイトのビジュアル制作を担当。グッズ、SNS用の長尺画像、大型広告などを制作し、中国・韓国の商業施設や駅、バス停で掲出された。デザインに参加したグッズは完売し、ファンの参加度向上に貢献した。",
  "2020.01 ～ 至今": "2020.01 ～ 現在",
  "视觉设计兼职": "ビジュアルデザイン アルバイト",
  "在大阪 VS. 艺术展览馆担任展览工作人员，参与展览现场的布展、撤展及作品陈列工作。面向观众进行作品解说，介绍体验方式与观看重点，提升观众对展览的理解。": "大阪のVS.にて展覧会スタッフとして、会場設営、撤収、作品展示に参加。来場者に作品解説を行い、体験方法や鑑賞のポイントを伝えることで、展覧会への理解を深めた。",
  "展览工作兼职": "展覧会スタッフ アルバイト",
  "协助日本东京原创手作服饰设计品牌在中国小红书的账号运营，负责内容策划、拍摄、剪辑与发布。结合平台特点，发布品牌穿搭展示、生活方式类内容。通过持续内容输出，提升品牌提升在中国社交媒体平台的曝光度与关注度，积累了跨境品牌传播与新媒体运营经验。": "東京発のオリジナルファッションブランドの中国向けREDアカウントを運営。撮影・編集・投稿を行い、コーディネートやライフスタイルコンテンツを通して、中国SNSでの認知向上に貢献した。",
  "小红书账号运营兼职": "REDアカウント運営 アルバイト",
  "校园活动经历": "学内活動",
  "使用Codex进行基于留学期间代购京都作家器物的个人经历，抓住“展期咨询杂乱，预购不便”的用户痛点，使用AI帮我整理即将/在售的器物展，制作面向中国器物爱好者的导览网站。使用 Codex 进行 AI 协作开发，将产品需求转化为 Prompt 指令，并参与前端页面、交互逻辑、响应式布局的多轮调整与迭代。": "京都で作家ものの器を代行購入した経験をもとに、展示情報の探しにくさや予約の不便さに着目。Codexを使って、中国の器好きに向けた京都器物ガイドサイトを制作した。",
  "AI产品设计": "AIプロダクトデザイン",
  "参与年度研究室成果展览的整体策划，结合参展作品内容优化展示形式和观看路径。负责展览主视觉设计，提取参展作品的共性进行视觉转化。": "年度ゼミ展の企画に参加し、展示形式と鑑賞導線を検討。メインビジュアルを担当し、出展作品に共通する要素を視覚化した。",
  "展览策划&视觉设计": "展覧会企画・ビジュアルデザイン",
  "京都艺术大学研究生共创会": "京都芸術大学大学院 共創会",
  "与研究室同伴创办大学院首个以影像艺术、声音实验、互动媒体等跨领域交流为目的的社团，搭建研究生之间沟通与合作的平台。": "研究室の仲間と、映像、音、インタラクティブメディアなどの交流を目的とした大学院サークルを設立。大学院生同士の対話と協働の場をつくった。",
  "2025.07 ～ 至今": "2025.07 ～ 現在",
  "社团活动": "サークル活動",
  "第13届大学生广告艺术大赛": "第13回大学生広告芸術コンテスト",
  "领导六人团队完成产品的整体策划与设计，包括项目分工、进度推进与方案统筹。负责设计线下活动体验流程，规划用户从接触产品、参与互动到形成反馈的完整路径，提升产品体验感与现场转化效果。": "6人チームでプロダクトの企画・デザインを担当。ユーザー分析とオフライン体験イベントの導線設計を行った。",
  "广告策划课题": "広告企画 課題",
  "独立完成中国各大城市「PM2.5 污染情况及其与二氧化碳关系」的数据可视化作品。从数据清洗与整理、使用 Tableau 完成数据图表制作、到最后进行视觉转化，提升了数据分析、信息设计与可视化表达能力。": "中国主要都市のPM2.5汚染と二酸化炭素の関係をテーマに、データ収集・整理、Tableauでの可視化、ビジュアル設計まで一貫して制作した。",
  "数据可视化课题": "データビジュアライゼーション 課題",
  "浙江理工大学创新创业易维项目": "浙江理工大学 イノベーションプロジェクト",
  "与不同专业同学共同设计集取件码与人脸识别功能于一体的校园智慧柜，针对校园印刷材料存取不便、文件缺失、纸张堆放混乱等问题提出产品解决方案。负责产品外观与结构设计，结合校园使用场景，规划柜体形态、取件区域、操作界面。": "異なる専攻の学生と、受取コードと顔認証機能を備えた学内スマートボックスを共同設計。外観と構造設計を担当した。",
  "产品设计课题": "プロダクトデザイン 課題",
  "获奖经历": "受賞歴",
  "2020年　浙江理工大学年度优秀奖学金": "2020年　浙江理工大学 年度優秀奨学金",
  "2021年　浙江理工大学漫画募集大会一等奖": "2021年　浙江理工大学 漫画募集大会 一等賞",
  "2023年　浙江理工大学本科优秀毕业设计奖": "2023年　浙江理工大学 学部優秀卒業制作賞",
  "软件技能": "ソフトウェアスキル",
  "快乐照相馆": "ハッピー写真屋",
  "线": "糸",
  "缓缓": "ゆっくり",
  "毒": "毒",
  "你要戳泡吗？": "泡を突くのか?",
  "修士考学作品": "大学院受験作品",
  "大学院研究室成果展作品": "大学院ゼミ展作品",
  "本科毕业设计": "学部卒業制作",
  "本科课程设计": "学部課題",
  "虚拟偶像工厂": "仮想偶像工場",
  "音乐可视化": "音楽の可視化",
  "大屏": "広告",
  "盲盒设计": "ブラインドボックスデザイン",
  "广告·海报设计": "広告・ポスターデザイン",
  "乡旅说走就走": "農村旅、すぐ出発",
  "背景分析": "背景分析",
  "竞品分析": "競合分析",
  "用户调研": "ユーザー調査",
  "用户体验旅程图": "ユーザー体験ジャーニーマップ",
  "痛点分析与功能转换": "課題分析と機能転換",
  "特色功能提炼": "特徴機能の抽出",
  "用户测试": "ユーザーテスト",
  "可用性测试": "ユーザビリティテスト",
  "最终APP架构": "最終APP構成",
  "设计规范": "デザインガイドライン",
  "高保真": "ハイファイモックアップ",
  "深圳VIEW": "深センVIEW",
  "展览海报设计": "展覧会ポスターデザイン",
  "音乐可视化练习": "音楽ビジュアライザー習作",
  "包装与小卡设计": "パッケージとトレカデザイン",
  "展示风景": "展示風景",
  "StrayKids周年纪念广告，展示于首尔2号线建大站。": "StrayKids周年記念広告。ソウル2号線建大駅に掲出。",
  "StrayKids回归宣传广告，展示于首尔2号线与机场铁路弘大站换乘通道。": "StrayKidsカムバック広告。ソウル2号線・空港鉄道弘大入口駅の乗換通路に掲出。",
  "李东海生日应援广告，展示于首尔City Vision公交站。": "李東海誕生日応援広告。ソウルCity Visionバス停に掲出。",
  "2022年制作\n修士考学作品": "2022年制作\n大学院受験作品",
  "2025年制作\n大学院研究室成果展作品": "2025年制作\n大学院ゼミ展作品",
  "2024年制作\n修士考学作品": "2024年制作\n大学院受験作品",
  "2023年制作\n修士考学作品": "2023年制作\n大学院受験作品",
  "2023年制作\n本科毕业设计": "2023年制作\n学部卒業制作",
  "2022年制作\n本科课程设计": "2022年制作\n学部課題",
  "2025年制作\n大学院研究室成果展主视觉": "2025年制作\n大学院研究室成果展メインビジュアル",
  "2023年制作\n音乐可视化练习": "2023年制作\n音楽ビジュアライザー習作",
  "2021年制作\n盲盒设计": "2021年制作\nブラインドボックスデザイン",
  "2021年～2024年制作\n粉丝站线下应援物设计": "2021年～2024年制作\nファンサイト応援広告デザイン",
  "Vibe Coding｜AI产品实践": "Vibe Coding｜AIプロダクト実践",
  "「THE MENU」研究室成果展": "「THE MENU」研究室成果展",
  "PremierePro、屏幕、摄像头、热敏打印机、": "PremierePro、スクリーン、カメラ、感熱プリンター、",
  "超声波距离传感器、风扇、PVC镜面布": "超音波距離センサー、扇風機、PVCミラー布",
  "这是一件体验型装置作品，": "体験型インスタレーション作品。",
  "旨在表达当代中国年轻人在社会压力、现实困境": "現代中国の若者が、社会的プレッシャーや現実の困難、",
  "与网络文化之间所形成的复杂又矛盾的精神状态。": "ネット文化の間で抱える複雑で矛盾した精神状態を表現している。",
  "本作品创作于新冠疫情的封闭时期。网络成为人们释放情绪的主要出口，借此来逃避现实中的压抑。": "本作品は、新型コロナによる閉鎖的な時期に制作した。ネットは感情を吐き出し、現実の抑圧から逃れるための主な出口となっていた。",
  "我称之为“当代人的阿Q精神”。并通过影像和风的互动体验，将这种现象具像化，让观众切身感受到“苦中作乐”的矛盾感。": "私はそれを「現代人の阿Q精神」と捉え、映像と風の体験を通して「苦しみの中で楽しむ」矛盾を可視化した。",
  "装置由影像、风扇、摄像头、热敏打印机、超声波距离传感器等构成。": "装置は映像、扇風機、カメラ、感熱プリンター、超音波距離センサーで構成される。",
  "当感应到头伸进箱子里时，装置会启动风扇，开始播放诙谐的影像。": "頭が箱の中に入ったことを検知すると、装置は扇風機を起動し、ユーモラスな映像を再生する。",
  "与此同时，摄像头会拍下观众被风吹的扭曲的表情，并通过热敏打印机打印出来。": "同時に、カメラが風で歪んだ観客の表情を撮影し、感熱プリンターで出力する。",
  "让观众在看似轻松有趣的互动中，体会情绪和身体感受相左的冲突感。": "観客は一見軽やかで楽しい体験の中で、感情と身体感覚がずれる葛藤を感じる。",
  "从社会文化层面来看，本作品也试图反思一种长期存在的顺从、忍耐与内部竞争的文化心理。": "社会文化の視点から、本作品は長く存在してきた従順、忍耐、内部競争の文化心理を考察する。",
  "当外部环境难以改变，个体又缺乏真正表达和反抗的空间时，人们往往会转向内部消化痛苦，通过自嘲、迷信和娱乐化来寻找精神寄托。": "外部環境を変えることが難しく、個人が本当に表現し抵抗する場を持てないとき、人々は痛みを内側で消化し、自嘲、迷信、娯楽化によって精神的なよりどころを探す。",
  "通过箱体封闭的空间，将观众与现实世界隔离开来，PVC镜面布的反射带来一种眩晕般的体验感。": "箱の閉じられた空間によって観客を現実世界から切り離し、PVCミラー布の反射がめまいのような体験を生み出す。",
  "杂草、LED灯带、触觉传感器、震动马达": "雑草、LEDテープ、触覚センサー、振動モーター",
  "这是一件影像交互装置作品，": "本作品は、道端に生える雑草から着想を得た",
  "灵感来源于在狭窄而严酷环境中": "映像インタラクティブ・インスタレーションである。",
  "依然顽强生长的路边杂草，": "狭く厳しい環境の中でも力強く生きる雑草に触れたときの、",
  "触摸它们时所感受到的生命力与宁静。": "生命力や静けさを表現しようとした。",
  "在现代社会快节奏的生活中，工作与学习带来的压力，": "現代社会の速い生活リズムの中で、仕事や学業から生じるプレッシャー、",
  "以及来自社会无形的规训，仿佛将我像一根绷紧的细线般不断拉扯。": "そして社会からの見えない規律が、私を張りつめた細い糸のように引っ張り続けている。",
  "我尝试将杂草的生命力可视化，并通过触觉、声音、影像的联动，": "雑草の生命力を可視化し、触覚、音、映像を連動させることで、",
  "创造让人能在忙碌生活中稍作喘息的疗愈空间。": "忙しい日常の中で少し息をつける癒しの空間をつくろうとした。",
  "当触摸叶片时，影像中飘散的粒子逐渐汇聚成杂草的形态，并伴随着心脏跳动般的起伏。": "葉に触れると、映像内に漂う粒子が徐々に雑草の形へと集まり、心臓の鼓動のように揺らぐ。",
  "灯带如血管中的血液般，由影像中的杂草流向观众的手指。指尖可以感受到叶片随着画面的跳动幅度轻轻震动。": "LEDテープは血管を流れる血液のように、映像内の雑草から観客の指先へと流れる。指先では、画面の動きに合わせて葉が微かに振動する感覚を得られる。",
  "同时，空间中播放着自然界中提取的声音，使观众感受到生命之间的共鸣与连接。": "同時に、空間には自然界から抽出した音が流れ、観客に生命同士の共鳴とつながりを感じさせる。",
  "我将所拍摄的路边杂草形状进行拓印。": "撮影した道端の雑草の形を拓本として写し取った。",
  "Arduino、AfterEffects、Premiere Pro、音响、抱枕、纱布": "Arduino、AfterEffects、Premiere Pro、スピーカー、抱き枕、ガーゼ",
  "这是一件实验性的空间互动装置作品。": "実験的な空間インタラクティブ・インスタレーション作品。",
  "通过声、光与拥抱这一动作、探讨空间与人，人与人之间的关系。": "音、光、抱きしめる行為を通して、空間と人、人と人の関係を探る。",
  "抱枕内设置了声音装置，拥抱时观众可以听见呼吸、心跳、肠胃蠕动等人体内的声音。": "抱き枕の内部には音響装置が設置され、抱きしめると呼吸、心拍、胃腸の動きなど人体内部の音が聞こえる。",
  "伴随枕头柔软的触感，声音响起时的振动，带来与人拥抱的感受，使心情逐渐平静下来。": "枕の柔らかな触感と、音が鳴るときの振動が、人を抱きしめているような感覚をもたらし、気持ちを少しずつ落ち着かせる。",
  "影像部分，我用颜文字来表现雨、雪、晴等天气。象征着数字化时代，语言文字的退化。": "映像部分では、顔文字で雨、雪、晴れなどの天気を表現し、デジタル時代における言語文字の退化を象徴している。",
  "观众被影像的光与图形所包裹，淡化了身体外貌的特征。": "観客は映像の光と図形に包まれ、身体的な外見の特徴が薄れていく。",
  "我希望创造出人与人、人与物能够平等地交流，并从中获得安心感的空间。": "人と人、人と物が平等に交流し、その中で安心感を得られる空間をつくりたいと考えた。",
  "PremierePro、Axure、超感纸、显示器": "PremierePro、Axure、特殊紙、ディスプレイ",
  "本作品通过影像、网页设计、手册设计三个部分，": "映像、ウェブサイト、冊子の三部構成で、",
  "表现了当下偶像产业的工厂化。": "現代アイドル産業の工場化を表現した。",
  "从音乐到形象，甚至性格都被精心包装，": "音楽からイメージ、さらには性格までもが丁寧にパッケージ化され、",
  "偶像似流水线上源源不断的产品。": "アイドルは生産ラインから次々と生まれる製品のように見える。",
  "我通过“设计、组装、筛选、包装、上市”": "私は「デザイン、組み立て、選別、包装、発売」という",
  "五个循环影像，描绘了偶像诞生的华丽与残酷。": "五つのループ映像で、アイドルが生まれる華やかさと残酷さを描いた。",
  "从左到右：设计、组装、筛选、包装、上市": "左から右へ：デザイン、組み立て、選別、包装、発売",
  "整体展示风景": "展示全景",
  "手册设计的部分，": "冊子デザインの部分では、",
  "为了丰富“虚拟公司”的概念，": "「バーチャル企業」という概念をより豊かにするため、",
  "我加入了更多关于公司的详细信息。": "会社に関するより詳細な情報を加えた。",
  "内容包含公司发展历史、部门构成、热门商品、": "内容は会社の発展史、部門構成、人気商品、",
  "新商品、网站、产品发展趋势六个部分。": "新商品、ウェブサイト、製品の発展傾向という六つの部分で構成されている。",
  "通过这些内容，详细介绍了": "これらの内容を通して、",
  "VIEX（Virtual Idol Expert）娱乐公司的世界观。": "VIEX（Virtual Idol Expert）エンターテインメント社の世界観を詳しく紹介している。",
  "这是一个可交互的公司官方网站，": "これはインタラクティブな会社公式サイトで、",
  "由“首页、关于公司、关于艺人、联系我们”四个部分构成。": "「ホーム、会社紹介、アーティスト紹介、お問い合わせ」の四つの部分で構成されている。",
  "Blender、投影仪、气泡板、木材、黏土、塑料植物": "Blender、プロジェクター、気泡板、木材、粘土、造花",
  "这是一件影像作品，": "映像作品。",
  "我将信息化社会中的一些极端现象，": "情報化社会におけるいくつかの極端な現象を、",
  "与佛教中的五毒结合起来。": "仏教における五毒と結びつけた。",
  "探讨人类如何因电子媒体的侵蚀而逐渐被异化。": "電子メディアの侵食によって人間がどのように徐々に疎外されていくのかを探る。",
  "将现代社会问题与传统形象相结合，": "現代社会の問題と伝統的なイメージを組み合わせることで、",
  "带来更具有冲击的表现形式。": "より強いインパクトを持つ表現形式を生み出した。",
  "影像部分将信息社会中存在的": "映像部分では、情報社会に存在する",
  "“过度消费、网络暴力、盲目从众、": "「過剰消費、ネット暴力、盲目的な同調、",
  "随意贴标签、过度猜疑”等问题，": "安易なレッテル貼り、過度な疑念」といった問題を、",
  "与佛教中的“贪、嗔、痴、慢、疑”": "仏教における「貪、瞋、痴、慢、疑」と",
  "这五种烦恼结合起来进行表现。": "いう五つの煩悩と結びつけて表現している。",
  "观众以第一人称视角，": "観客は一人称視点で、",
  "进入如电脑界面般的“中阴界”，": "コンピューター画面のような「中陰界」に入り、",
  "在其中逐渐被烦恼侵蚀，": "その中で徐々に煩悩に侵食され、",
  "最终陷入痛苦，无法从轮回中脱离。": "最終的に苦しみに陥り、輪廻から抜け出せなくなる。",
  "本作品围绕信息化社会中的极端现象将其视觉化，": "本作品は情報化社会における極端な現象を可視化し、",
  "旨在提醒观众注意自己不要被电子媒体所异化。": "観客自身が電子メディアによって疎外されないよう注意を促すことを目的としている。",
  "作品以沉浸式影像空间的形式进行展出，": "作品は没入型の映像空間として展示され、",
  "通过模糊现实世界与虚拟世界的边界带给观众更强烈的体验。": "現実世界と仮想世界の境界を曖昧にすることで、より強い体験を観客にもたらす。",
  "Premiere Pro、TouchDesigner、气泡膜、硫酸纸": "Premiere Pro、TouchDesigner、気泡緩衝材、トレーシングペーパー",
  "本作品通过影像、插画和图形，": "本作品では、映像・イラスト・グラフィックを通して、",
  "对“Filter Bubbles（过滤气泡）”": "「フィルターバブル」と呼ばれるネット社会の現象を視覚化し、",
  "这一网络现象进行视觉化拆解与表现。": "その構造を表現している。",
  "通过动态海报描绘了过滤气泡产生的六步过程。": "モーションポスターで、フィルターバブルが生まれる六つの過程を描いた。",
  "插画描绘了过滤气泡带来的危害，": "イラストではフィルターバブルがもたらす危害を描き、",
  "左上群体极化，右上反转新闻，": "左上は集団極化、右上は反転ニュース、",
  "左下信息同质化，右下大数据杀熟。": "左下は情報の同質化、右下はビッグデータによる価格差別を表している。",
  "下图为影像部分关键帧，": "下図は映像部分のキーフレームで、",
  "通过图形动画详细表现了过滤气泡的危害，并提醒观众思考“戳泡”与否。": "グラフィックアニメーションによってフィルターバブルの危害を詳しく表現し、観客に「泡を突く」かどうかを考えさせる。",
  "毕设展示风景": "卒業制作展示風景",
  "这是一款集“门票预约、项目预定、酒店预约、": "チケット予約、体験予約、ホテル予約、",
  "个性化路线定制”等一站式服务的乡旅APP产品，": "ルート作成をまとめて行えるローカル旅アプリ。",
  "配合AR互动体验，旨在增强游玩的趣味性。": "AR体験を取り入れ、旅の楽しさを高めることを目指した。",
  "这是以城市宣传为中心的网页设计，": "都市プロモーションをテーマにしたウェブデザイン。",
  "我选取“深圳”为主题，": "「深セン」をテーマに、",
  "围绕城市文化、建筑美学与生活印象展开，": "文化、建築美、生活の印象を軸に展開し、",
  "旨在更直观地传达城市魅力。": "都市の魅力を直感的に伝えることを目指した。",
  "网站由“首页、周末去哪、美食探店、场馆预约”等模块构成。": "サイトは「ホーム、週末のお出かけ、グルメ探訪、施設予約」などのモジュールで構成されている。",
  "整体设计采用简洁现代的风格，并结合网格布局、": "全体はミニマルでモダンなトーンとし、グリッドレイアウト、",
  "留白处理与柔和色调，突出深圳建筑线条的美感与空间感。": "余白処理、柔らかな色調を組み合わせ、深センの建築線の美しさと空間感を際立たせている。",
  "2025年度研究室成果展设计的主视觉。": "2025年度ゼミ展のメインビジュアル。",
  "扫海报中的二维码，": "ポスター内のQRコードを読み取り、",
  "进行简单的游戏互动，增加趣味性。": "簡単なゲームを体験できる仕組みにした。",
  "为“李东海ELFISH吧”设计的系列偶像盲盒产品。": "「李東海ELFISH吧」のために制作したアイドルブラインドボックスシリーズ。",
  "为粉丝站设计用于宣传的广告·海报，": "ファンサイトのために制作した広告・ポスター。",
  "在中国、韩国的商场、地铁站、公交站等": "中国・韓国の商業施設、地下鉄駅、バス停など",
  "线下公共空间实际投放。": "オフライン公共空間で実際に掲出された。",
  "影像；装置；UI／UX；平面": "映像；インスタレーション；UI／UX；グラフィック"
};

const translateText = (text) => (currentLanguage === "jp" ? jaText[text] || text : text);
let currentLanguage = "cn";
const translatableTextNodes = [];
const aboutIntroText = document.querySelector(".about-intro p");
const aboutIntroCnHtml = aboutIntroText?.innerHTML || "";
const aboutIntroJaHtml = [
  "2001年、中国・深セン生まれ。",
  "浙江理工大学でデジタルメディアアートを専攻し、インタラクションデザインを学ぶ。",
  "現在は京都芸術大学大学院で映像領域を専攻し、",
  "主に多感覚的なインタラクティブ映像インスタレーションを制作している。",
].join("<br />");
const slowSoundText = document.querySelector(".slow-detail-sound-copy");
const slowSoundCnHtml = slowSoundText?.innerHTML || "";
const slowSoundJaHtml = [
  "抱き枕の内部には音響装置が設置され、",
  "抱きしめると呼吸、心拍、胃腸の動きなど人体内部の音が聞こえる。",
  "枕の柔らかな触感と、音が鳴るときの振動が、",
  "人を抱きしめているような感覚をもたらし、気持ちを少しずつ落ち着かせる。",
].join("<br />");
const virtualBookText = document.querySelector(".virtual-detail-book-copy");
const virtualBookCnHtml = virtualBookText?.innerHTML || "";
const virtualBookJaHtml = [
  "冊子デザインの部分では、「バーチャル企業」",
  "という概念をより豊かにするため、",
  "会社に関するより詳細な情報を加えた。",
  "内容は会社の発展史、部門構成、人気商品、",
  "新商品、ウェブサイト、製品の発展傾向",
  "という六つの部分で構成されている。",
  "これらの内容を通して、",
  "エンターテインメント社の",
  "世界観を詳しく紹介している。",
].join("<br />");
const virtualWebText = document.querySelector(".virtual-detail-web-copy");
const virtualWebCnHtml = virtualWebText?.innerHTML || "";
const virtualWebJaHtml = [
  "これはインタラクティブな会社公式サイトで、",
  "「ホーム、会社紹介、アーティスト紹介、お問い合わせ」",
  "の四つの部分で構成されている。",
].join("<br />");
const poisonHeroText = document.querySelector(".poison-detail-hero-copy");
const poisonHeroCnHtml = poisonHeroText?.innerHTML || "";
const poisonHeroJaHtml = [
  "本作品では、情報化社会に見られる",
  "極端な現象を仏教の「五毒」と重ね合わせ、",
  "電子メディアの浸透によって",
  "人間がいかに異化されていくのかをテーマとしている。",
].join("<br />");
const filterPosterText = document.querySelector(".filter-detail-poster-copy");
const filterPosterCnHtml = filterPosterText?.innerHTML || "";
const filterPosterJaHtml = [
  "モーションポスターで、フィルターバブルが",
  "生まれる六つの過程を描いた。",
].join("<br />");
const filterComicText = document.querySelector(".filter-detail-comic-copy");
const filterComicCnHtml = filterComicText?.innerHTML || "";
const filterComicJaHtml = [
  "イラストではフィルターバブルがもたらす危害を描き、",
  "左上は集団極化、右上は反転ニュース、",
  "左下は情報の同質化、",
  "右下はビッグデータによる価格差別を表している。",
].join("<br />");
const filterToolsText = document.querySelector(".filter-detail-tools");
const filterToolsCnHtml = filterToolsText?.innerHTML || "";
const filterToolsJaHtml = [
  "Illustrator、Photoshop、AfterEffects、Premiere Pro、",
  "TouchDesigner、気泡緩衝材、トレーシングペーパー",
].join("<br />");
const blindboxHeroText = document.querySelector(".blindbox-detail-hero-copy");
const blindboxHeroCnHtml = blindboxHeroText?.innerHTML || "";
const blindboxHeroJaHtml = [
  "「李東海ELFISH吧」のために制作した",
  "アイドルブラインドボックスシリーズ。",
].join("<br />");
const poisonStoryboardText = document.querySelector(".poison-detail-storyboard-copy");
const poisonStoryboardCnHtml = poisonStoryboardText?.innerHTML || "";
const poisonStoryboardJaHtml = [
  "映像では、情報社会における",
  "過度な消費、ネット暴力、盲目的な同調、",
  "レッテル貼り、過剰な疑念といった問題を、仏教の",
  "「貪・瞋・痴・慢・疑」と結びつけて表現した。",
  "鑑賞者は一人称視点で、コンピューター画面の",
  "ような「中陰」の世界に入り、煩悩に侵食されながら、",
  "輪廻から抜け出せない苦しみを体験する。",
].join("<br />");
const poisonCloseupsText = document.querySelector(".poison-detail-closeups-copy");
const poisonCloseupsCnHtml = poisonCloseupsText?.innerHTML || "";
const poisonCloseupsJaHtml = [
  "本作品は情報化社会における極端な現象を可視化し、",
  "観客自身が電子メディアによって疎外されないよう",
  "注意を促すことを目的としている。",
  "作品は没入型の映像空間として展示され、",
  "現実世界と仮想世界の境界を曖昧にすることで、",
  "より強い体験を観客にもたらす。",
].join("<br />");

const collectTranslatableTextNodes = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, .language-switch")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) {
    translatableTextNodes.push({ node: walker.currentNode, text: walker.currentNode.nodeValue });
  }
};

const setLanguage = (language) => {
  if (language !== "cn" && language !== "jp") return;
  currentLanguage = language;
  document.documentElement.lang = language === "jp" ? "ja" : "zh-CN";

  languageButtons.forEach((button) => {
    const isCurrent = button.dataset.lang === language;
    button.classList.toggle("current-language", isCurrent);
    button.setAttribute("aria-pressed", String(isCurrent));
  });

  translatableTextNodes.forEach(({ node, text }) => {
    const trimmed = text.trim();
    const next = language === "jp" ? jaText[trimmed] : trimmed;
    node.nodeValue = next ? text.replace(trimmed, next) : text;
  });

  if (aboutIntroText) {
    aboutIntroText.innerHTML = language === "jp" ? aboutIntroJaHtml : aboutIntroCnHtml;
  }

  if (slowSoundText) {
    slowSoundText.innerHTML = language === "jp" ? slowSoundJaHtml : slowSoundCnHtml;
  }

  if (virtualBookText) {
    virtualBookText.innerHTML = language === "jp" ? virtualBookJaHtml : virtualBookCnHtml;
  }

  if (virtualWebText) {
    virtualWebText.innerHTML = language === "jp" ? virtualWebJaHtml : virtualWebCnHtml;
  }

  if (poisonHeroText) {
    poisonHeroText.innerHTML = language === "jp" ? poisonHeroJaHtml : poisonHeroCnHtml;
  }

  if (filterPosterText) {
    filterPosterText.innerHTML = language === "jp" ? filterPosterJaHtml : filterPosterCnHtml;
  }

  if (filterComicText) {
    filterComicText.innerHTML = language === "jp" ? filterComicJaHtml : filterComicCnHtml;
  }

  if (filterToolsText) {
    filterToolsText.innerHTML = language === "jp" ? filterToolsJaHtml : filterToolsCnHtml;
  }

  if (blindboxHeroText) {
    blindboxHeroText.innerHTML = language === "jp" ? blindboxHeroJaHtml : blindboxHeroCnHtml;
  }

  if (poisonStoryboardText) {
    poisonStoryboardText.innerHTML = language === "jp" ? poisonStoryboardJaHtml : poisonStoryboardCnHtml;
  }

  if (poisonCloseupsText) {
    poisonCloseupsText.innerHTML = language === "jp" ? poisonCloseupsJaHtml : poisonCloseupsCnHtml;
  }

  document.querySelectorAll("[data-cn-src][data-jp-src]").forEach((image) => {
    const nextSrc = language === "jp" ? image.dataset.jpSrc : image.dataset.cnSrc;
    if (nextSrc && image.getAttribute("src") !== nextSrc) image.setAttribute("src", nextSrc);
  });

  document.querySelectorAll("[data-title]").forEach((item) => {
    if (!item.dataset.cnTitle) item.dataset.cnTitle = item.dataset.title;
    item.dataset.title = language === "jp" ? jaText[item.dataset.cnTitle] || item.dataset.cnTitle : item.dataset.cnTitle;
  });

  renderedWorksSection = "";
  renderedWorksProjectSection = "";
  renderedWorksFocusIndex = -2;
  requestWorksBlurUpdate();
  syncWorksProjectText(programmaticWorksFocusIndex, heldWorksSection || "TOP");
};

collectTranslatableTextNodes();

const getLayoutViewportWidth = () => layoutWidth;
const getLayoutViewportHeight = () => window.innerHeight / siteScale;
const getWorksMoreSizing = () => {
  const compact = window.innerWidth <= layoutWidth / 2;
  return {
    baseWidth: compact ? 360 : 250,
    horizontalTargetWidth: compact ? 720 : 600,
    verticalTargetWidth: compact ? 560 : 450,
  };
};

const syncSiteScale = () => {
  siteScale = window.innerWidth / layoutWidth;
  const inverseSiteScale = Math.max(1, 1 / siteScale);
  document.documentElement.classList.toggle("is-scaled-layout", window.innerWidth < layoutWidth);
  document.documentElement.classList.toggle("is-compact-layout", window.innerWidth <= layoutWidth / 2);
  document.documentElement.style.setProperty("--site-scale", String(siteScale));
  document.documentElement.style.setProperty("--inverse-site-scale", String(inverseSiteScale));
};

syncSiteScale();
requestWorkDetailScaleMarginUpdate();
requestWorkDetailTextSqueezeUpdate();

const worksDetailSections = {
  Installation: {
    startIndex: 0,
    titles: ["快乐照相馆", "线", "缓缓"],
    notes: [
      "2022年制作\n修士考学作品",
      "2025年制作\n大学院研究室成果展作品",
      "2024年制作\n修士考学作品",
    ],
  },
  "Video Art": {
    startIndex: 3,
    titles: ["虚拟偶像工厂", "毒", "你要戳泡吗？"],
    notes: [
      "2023年制作\n修士考学作品",
      "2023年制作\n修士考学作品",
      "2023年制作\n本科毕业设计",
    ],
  },
  "UI/UX Design": {
    startIndex: 6,
    titles: ["TOGO", "深圳VIEW", ""],
    notes: [
      "2022年制作\n本科课程设计",
      "2022年制作\n本科课程设计",
      "",
    ],
  },
  "Graphic Design": {
    startIndex: 8,
    titles: ["THE MENU", "", ""],
    notes: [
      "2025年制作\n大学院研究室成果展主视觉",
      "",
      "",
    ],
  },
  Others: {
    startIndex: 9,
    titles: ["音乐可视化", "BLIND BOX", "大屏"],
    notes: [
      "2023年制作\n音乐可视化练习",
      "2021年制作\n盲盒设计",
      "2021年～2024年制作\n粉丝站线下应援物设计",
    ],
  },
};

const getWorksScale = () =>
  Number(getComputedStyle(document.documentElement).getPropertyValue("--works-scale")) || 1;

const initNetworkBackground = () => {
  if (!networkCanvas) return;

  const ctx = networkCanvas.getContext("2d");
  const duration = 20;
  const glyphs = "LIJIAYU1018";
  const nodes = [];
  const pins = [];
  let dpr = 1;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let lastTime = 0;
  let animationFrame = 0;
  let lastLinkShuffle = 0;
  let links = [];
  const frameInterval = 1000 / 20;

  const randomBetween = (min, max) => min + Math.random() * (max - min);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hueForTime = (time) => (time / 45) % 360;
  const rgbColor = (time, alpha = 1) => `hsla(${hueForTime(time)}, 86%, 42%, ${alpha})`;
  const hslToRgb = (hue, saturation, lightness) => {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const hueSection = hue / 60;
    const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
    const offset = lightness - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (hueSection < 1) [red, green] = [chroma, secondary];
    else if (hueSection < 2) [red, green] = [secondary, chroma];
    else if (hueSection < 3) [green, blue] = [chroma, secondary];
    else if (hueSection < 4) [green, blue] = [secondary, chroma];
    else if (hueSection < 5) [red, blue] = [secondary, chroma];
    else [red, blue] = [chroma, secondary];

    return [red, green, blue].map((channel) => Math.round((channel + offset) * 255)).join(", ");
  };
  const syncFolderColor = (time) => {
    card?.style.setProperty("--folder-rgb", hslToRgb(hueForTime(time), 0.86, 0.42));
  };
  const acceleratedEase = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const scaleAmountForPhase = (phase) =>
    phase < 0.5 ? acceleratedEase(phase * 2) : 1 - acceleratedEase((phase - 0.5) * 2);
  const nodePhase = (node, time) => ((time / 1000 / duration) + node.phase) % 1;
  const scaleSpeedForPhase = (phase) => {
    const delta = 0.002;
    const previous = scaleAmountForPhase((phase - delta + 1) % 1);
    const next = scaleAmountForPhase((phase + delta) % 1);
    return Math.abs(next - previous) / (delta * 2);
  };
  const currentRadius = (p, time) => {
    if (p.type === "pin") return p.baseRadius;
    return lerp(5, p.baseRadius, scaleAmountForPhase(nodePhase(p, time)));
  };

  const clampParticle = (p) => {
    if (!p) return;
    const r = Math.max(7, currentRadius(p, performance.now()));
    p.x = Math.max(r, Math.min(viewportWidth - r, p.x));
    p.y = Math.max(r, Math.min(viewportHeight - r, p.y));
  };

  const resizeCanvas = () => {
    dpr = 1;
    viewportWidth = getLayoutViewportWidth();
    viewportHeight = getLayoutViewportHeight();
    networkCanvas.width = Math.floor(viewportWidth * dpr);
    networkCanvas.height = Math.floor(viewportHeight * dpr);
    networkCanvas.style.width = `${viewportWidth}px`;
    networkCanvas.style.height = `${viewportHeight}px`;
    [...nodes, ...pins].forEach(clampParticle);
  };

  const makeParticle = (index, type) => {
    const isNode = type === "node";
    const speed = isNode ? randomBetween(8, 22) : randomBetween(10, 30);
    const angle = randomBetween(0, Math.PI * 2);
    const clusterA = { x: viewportWidth * 0.42, y: viewportHeight * 0.45 };
    const clusterB = { x: viewportWidth * 0.62, y: viewportHeight * 0.62 };
    const useCluster = isNode ? index < 7 : index < 12;
    const cluster = index % 2 === 0 ? clusterA : clusterB;

    return {
      index,
      type,
      x: useCluster ? cluster.x + randomBetween(-130, 130) : randomBetween(70, Math.max(90, viewportWidth - 70)),
      y: useCluster ? cluster.y + randomBetween(-120, 120) : randomBetween(70, Math.max(90, viewportHeight - 70)),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseRadius: isNode ? randomBetween(20, 40) : randomBetween(4.8, 7.5),
      phase: Math.random(),
      labelOffset: Math.floor(randomBetween(0, glyphs.length)),
    };
  };

  const particleFor = (endpoint) => (endpoint.type === "node" ? nodes[endpoint.index] : pins[endpoint.index]);

  const shuffleLinks = (time) => {
    const nextLinks = [];
    const maxNodeDistance = Math.min(viewportWidth, viewportHeight) * 0.28;
    const maxTailDistance = Math.min(viewportWidth, viewportHeight) * 0.2;

    nodes.forEach((node, nodeIndex) => {
      const nearbyNodes = nodes
        .map((other, index) => ({ index, distance: Math.hypot(node.x - other.x, node.y - other.y) }))
        .filter((item) => item.index !== nodeIndex && item.distance < maxNodeDistance)
        .sort((a, b) => a.distance - b.distance);

      if (nearbyNodes[0] && Math.random() < 0.72) {
        nextLinks.push({
          from: { type: "node", index: nodeIndex },
          to: { type: "node", index: nearbyNodes[0].index },
          maxDistance: maxNodeDistance * 1.18,
        });
      }

      if (nearbyNodes[1] && Math.random() < 0.32) {
        nextLinks.push({
          from: { type: "node", index: nodeIndex },
          to: { type: "node", index: nearbyNodes[1].index },
          maxDistance: maxNodeDistance,
        });
      }

      const nearbyPins = pins
        .map((pin, index) => ({ index, distance: Math.hypot(node.x - pin.x, node.y - pin.y) }))
        .filter((item) => item.distance < maxTailDistance)
        .sort((a, b) => a.distance - b.distance);

      const tailCount = Math.min(nearbyPins.length, Math.random() < 0.35 ? 2 : 1);
      for (let i = 0; i < tailCount; i++) {
        if (Math.random() < 0.82) {
          nextLinks.push({
            from: { type: "node", index: nodeIndex },
            to: { type: "pin", index: nearbyPins[i].index },
            maxDistance: maxTailDistance * 1.15,
          });
        }
      }
    });

    pins.forEach((pin, pinIndex) => {
      if (Math.random() > 0.16) return;
      const nearbyPin = pins
        .map((other, index) => ({ index, distance: Math.hypot(pin.x - other.x, pin.y - other.y) }))
        .filter((item) => item.index !== pinIndex && item.distance < maxTailDistance * 0.72)
        .sort((a, b) => a.distance - b.distance)[0];

      if (nearbyPin) {
        nextLinks.push({
          from: { type: "pin", index: pinIndex },
          to: { type: "pin", index: nearbyPin.index },
          maxDistance: maxTailDistance * 0.82,
        });
      }
    });

    for (let i = nextLinks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextLinks[i], nextLinks[j]] = [nextLinks[j], nextLinks[i]];
    }

    links = nextLinks.slice(0, Math.floor(randomBetween(7, 14)));
    lastLinkShuffle = time;
  };

  const setupParticles = () => {
    if (nodes.length) return;
    for (let i = 0; i < 10; i++) nodes.push(makeParticle(i, "node"));
    for (let i = 0; i < 22; i++) pins.push(makeParticle(i, "pin"));
    shuffleLinks(0);
  };

  const moveParticle = (p, dt, time) => {
    const wander = p.type === "node" ? 3.6 : 5.4;
    p.vx += Math.sin(time / 3600 + p.index * 1.7) * wander * dt;
    p.vy += Math.cos(time / 3900 + p.index * 1.3) * wander * dt;

    const maxSpeed = p.type === "node" ? 28 : 36;
    const speed = Math.hypot(p.vx, p.vy) || 1;
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const r = Math.max(7, currentRadius(p, time));
    if (p.x < r) {
      p.x = r;
      p.vx = Math.abs(p.vx);
    } else if (p.x > viewportWidth - r) {
      p.x = viewportWidth - r;
      p.vx = -Math.abs(p.vx);
    }

    if (p.y < r) {
      p.y = r;
      p.vy = Math.abs(p.vy);
    } else if (p.y > viewportHeight - r) {
      p.y = viewportHeight - r;
      p.vy = -Math.abs(p.vy);
    }
  };

  const drawSmallCircle = (x, y, r, time) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgbColor(time, 0.08);
    ctx.fill();
    ctx.strokeStyle = rgbColor(time, 0.38);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgbColor(time, 0.72);
    ctx.fill();
    ctx.restore();
  };

  const glyphFor = (node, time) => {
    const phase = nodePhase(node, time);
    const speed = Math.min(1, scaleSpeedForPhase(phase) / 2.3);
    const interval = lerp(980, 95, speed);
    const rhythmHit = Math.floor(speed * 9 + phase * 4);
    const step = Math.floor(time / interval + rhythmHit + node.labelOffset);
    return glyphs[(step + node.index * 3) % glyphs.length];
  };

  const drawCenterDot = (x, y, time) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rgbColor(time, 0.78);
    ctx.fill();
    ctx.restore();
  };

  const drawNodeCircle = (node, time) => {
    const r = currentRadius(node, time);
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(210, 208, 210, 0.1)";
    ctx.fill();
    ctx.strokeStyle = rgbColor(time, 0.27);
    ctx.lineWidth = 1;
    ctx.stroke();
    drawCenterDot(node.x, node.y, time);
    ctx.restore();
  };

  const drawNodeLabel = (node, time) => {
    const r = currentRadius(node, time);
    const fontSize = Math.max(3.2, r * 0.62);
    ctx.save();
    ctx.shadowColor = rgbColor(time, 0.46);
    ctx.shadowBlur = Math.max(0, Math.min(8, r * 0.22));
    ctx.fillStyle = rgbColor(time, 1);
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyphFor(node, time), node.x, node.y + fontSize * 0.04);
    ctx.restore();
  };

  const drawNetwork = (time) => {
    animationFrame = 0;
    if (
      document.hidden ||
      document.body.classList.contains("is-works") ||
      document.body.classList.contains("is-work-detail")
    ) return;
    if (lastTime && time - lastTime < frameInterval) {
      animationFrame = window.requestAnimationFrame(drawNetwork);
      return;
    }

    setupParticles();
    const dt = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 0.016);
    lastTime = time;
    if (!document.body.classList.contains("is-about") && !document.body.classList.contains("is-contact")) {
      syncFolderColor(time);
    }

    if (time - lastLinkShuffle > 5200) shuffleLinks(time);
    [...nodes, ...pins].forEach((p) => moveParticle(p, dt, time));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.strokeStyle = rgbColor(time, 0.4);
    ctx.lineWidth = 1;
    links.forEach((link) => {
      const from = particleFor(link.from);
      const to = particleFor(link.to);
      const distance = Math.hypot(from.x - to.x, from.y - to.y);
      if (distance > link.maxDistance) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    pins.forEach((pin) => drawSmallCircle(pin.x, pin.y, currentRadius(pin, time), time));
    nodes.forEach((node) => drawNodeCircle(node, time));
    nodes.forEach((node) => drawNodeLabel(node, time));
    animationFrame = window.requestAnimationFrame(drawNetwork);
  };

  const requestNetworkFrame = () => {
    if (
      animationFrame ||
      document.hidden ||
      document.body.classList.contains("is-works") ||
      document.body.classList.contains("is-work-detail")
    ) return;
    lastTime = 0;
    animationFrame = window.requestAnimationFrame(drawNetwork);
  };

  window.addEventListener("resize", () => {
    syncSiteScale();
    resizeCanvas();
    requestNetworkFrame();
  });
  window.addEventListener("hashchange", requestNetworkFrame);
  document.addEventListener("visibilitychange", requestNetworkFrame);
  resizeCanvas();
  requestNetworkFrame();
};

const setWorksActiveSection = (section) => {
  if (renderedWorksSection === section) return;
  renderedWorksSection = section;
  worksFilterLinks.forEach((link) => {
    link.classList.toggle("is-active", link.textContent.trim() === section);
  });
};

const syncWorksProjectText = (focusedIndex, activeSection) => {
  const detailsSection = worksDetailSections[activeSection] ? activeSection : "";
  enabledWorksDetailsSection = detailsSection;
  if (renderedWorksFocusIndex === focusedIndex && renderedWorksProjectSection === activeSection) return;
  renderedWorksFocusIndex = focusedIndex;
  renderedWorksProjectSection = activeSection;

  const details = worksDetailSections[detailsSection];
  const isVisible = Boolean(details);
  const localIndex = details
    ? Math.max(0, Math.min(details.titles.length - 1, focusedIndex - details.startIndex))
    : 0;

  worksProjectList?.classList.toggle("is-visible", isVisible);
  worksProjectNote?.classList.toggle("is-visible", isVisible);

  worksProjectListItems.forEach((item, index) => {
    const title = details?.titles[index] || "";
    item.textContent = translateText(title);
    item.hidden = !title;
    item.classList.toggle("is-active", isVisible && Boolean(title) && index === localIndex);
  });

  if (worksProjectNote) {
    worksProjectNote.textContent = isVisible ? translateText(details.notes[localIndex]) : "";
  }
};

const resetWorksToTop = () => {
  window.clearTimeout(worksActiveHoldTimer);
  window.clearTimeout(worksScrollCorrection);
  heldWorksSection = "";
  enabledWorksDetailsSection = "";
  worksPage?.scrollTo({ top: 0, behavior: "auto" });
  setWorksActiveSection("TOP");
  syncWorksProjectText(-1, "TOP");
  requestWorksBlurUpdate();
};

const clearLineHeroTransition = () => {
  window.clearTimeout(lineHeroTransitionTimer);
  window.cancelAnimationFrame(lineHeroTransitionFrame);
  lineHeroTransitionFrame = 0;
  lineHeroTransitionClone?.remove();
  lineHeroTransitionClone = null;
  lineHeroTransitionDebug?.remove();
  lineHeroTransitionDebug = null;
  document.body.classList.remove("is-line-transitioning");
  document.body.classList.remove("is-line-transition-measuring");
};

const getFallbackWorkHeroRect = () => {
  const isNarrow = window.innerWidth <= 720;
  const pageX = isNarrow ? 24 : 72;
  const pageTop = isNarrow ? 120 : 151;
  const width = isNarrow ? window.innerWidth - pageX * 2 : Math.min(1180, window.innerWidth - pageX * 2);

  if (window.innerWidth <= 480) {
    return {
      top: pageTop,
      left: pageX,
      width,
      height: width / 1.5,
    };
  }

  const gap = 70;
  const availableWidth = width - gap;
  const proportionalTextWidth = availableWidth / 5.09;
  const textWidth = Math.max(180, proportionalTextWidth);
  const imageWidth = availableWidth - textWidth;
  const imageHeight = imageWidth / 1.5;

  return {
    top: pageTop,
    left: pageX,
    width: imageWidth,
    height: imageHeight,
  };
};

const waitForTransitionImage = (image) => {
  if (!image || image.tagName !== "IMG") return Promise.resolve();
  image.loading = "eager";
  image.fetchPriority = "high";

  const ready = (async () => {
    if (!image.complete || !image.naturalWidth) {
      await new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }
    if (image.decode) {
      await image.decode().catch(() => {});
    }
  })();

  return ready;
};

const animateWorkHeroClone = (clone, sourceRect, getTargetRect, targetRoute, sourceFilter = "none") => {
  const duration = 960;
  const startedAt = performance.now();
  const sourceBlur = Number(sourceFilter.match(/blur\(([\d.]+)px\)/)?.[1] || 0);
  const easeInOut = (value) => {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  };

  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = easeInOut(progress);
    const targetRect = getTargetRect();
    const top = sourceRect.top + (targetRect.top - sourceRect.top) * eased;
    const left = sourceRect.left + (targetRect.left - sourceRect.left) * eased;
    const width = sourceRect.width + (targetRect.width - sourceRect.width) * eased;
    const height = sourceRect.height + (targetRect.height - sourceRect.height) * eased;

    clone.style.top = `${top}px`;
    clone.style.left = `${left}px`;
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    if (sourceBlur > 0) {
      const blur = sourceBlur * (1 - eased);
      clone.style.filter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : "none";
    }

    if (progress < 1) {
      lineHeroTransitionFrame = window.requestAnimationFrame(tick);
      return;
    }

    if (window.location.hash !== targetRoute) {
      window.location.hash = targetRoute.slice(1);
    }
    syncRoute();
    lineHeroTransitionTimer = window.setTimeout(clearLineHeroTransition, 120);
  };

  lineHeroTransitionFrame = window.requestAnimationFrame(tick);
};

const playWorkHeroTransition = async (sourceLink) => {
  const targetRoute = sourceLink?.dataset?.route;
  const isLineTarget = targetRoute === "#work-line";
  const isHappyTarget = targetRoute === "#work-happy";
  const isSlowTarget = targetRoute === "#work-slow";
  const isVirtualTarget = targetRoute === "#work-virtual";
  const isFilterTarget = targetRoute === "#work-filter";
  const isPoisonTarget = targetRoute === "#work-poison";
  const isTogoTarget = targetRoute === "#work-togo";
  const isViewTarget = targetRoute === "#work-view";
  const isMenuTarget = targetRoute === "#work-menu";
  const isMusicTarget = targetRoute === "#work-music";
  const isBlindboxTarget = targetRoute === "#work-blindbox";
  const isScreenTarget = targetRoute === "#work-screen";
  const sourceImage = sourceLink?.querySelector("img");

  if (
    !sourceImage ||
    (
      !isLineTarget &&
      !isHappyTarget &&
      !isSlowTarget &&
      !isVirtualTarget &&
      !isFilterTarget &&
      !isPoisonTarget &&
      !isTogoTarget &&
      !isViewTarget &&
      !isMenuTarget &&
      !isMusicTarget &&
      !isBlindboxTarget &&
      !isScreenTarget
    )
  ) {
    if (targetRoute) window.location.hash = targetRoute.slice(1);
    return;
  }

  const sourceRect = sourceImage.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height) {
    window.location.hash = targetRoute.slice(1);
    return;
  }

  clearLineHeroTransition();
  document.body.classList.add("is-line-transitioning");

  const clone = sourceImage.cloneNode(false);
  const sourceFilter = getComputedStyle(sourceImage).filter;
  lineHeroTransitionClone = clone;
  clone.className = "line-hero-transition-image";
  clone.removeAttribute("loading");
  clone.removeAttribute("decoding");
  clone.style.top = `${sourceRect.top}px`;
  clone.style.left = `${sourceRect.left}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.filter = sourceFilter;
  clone.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
  document.body.appendChild(clone);
  clone.getBoundingClientRect();

  document.body.classList.add("is-line-transition-measuring");
  document.body.classList.add(
    isLineTarget
      ? "is-line-detail"
      : isHappyTarget
        ? "is-happy-detail"
        : isSlowTarget
          ? "is-slow-detail"
          : isVirtualTarget
            ? "is-virtual-detail"
            : isFilterTarget
              ? "is-filter-detail"
              : isTogoTarget
                ? "is-togo-detail"
                : isViewTarget
                  ? "is-view-detail"
                  : isMenuTarget
                    ? "is-menu-detail"
                    : isMusicTarget
                      ? "is-music-detail"
                      : isBlindboxTarget
                        ? "is-blindbox-detail"
                        : isScreenTarget
                          ? "is-screen-detail"
                          : "is-poison-detail",
  );
  document.body.classList.add("is-work-detail");
  const detailPage = document.querySelector(
    isLineTarget
      ? ".line-detail-page"
      : isHappyTarget
        ? ".happy-detail-page"
        : isSlowTarget
          ? ".slow-detail-page"
          : isVirtualTarget
            ? ".virtual-detail-page"
            : isFilterTarget
              ? ".filter-detail-page"
              : isTogoTarget
                ? ".togo-detail-page"
                : isViewTarget
                ? ".view-detail-page"
                : isMenuTarget
                  ? ".menu-detail-page"
                  : isMusicTarget
                    ? ".music-detail-page"
                    : isBlindboxTarget
                      ? ".blindbox-detail-page"
                      : isScreenTarget
                        ? ".screen-detail-page"
                        : ".poison-detail-page",
  );
  const targetImage = document.querySelector(
    isLineTarget
      ? ".line-detail-page .line-detail-hero > img"
      : isHappyTarget
        ? ".happy-detail-page .happy-detail-hero > img"
        : isSlowTarget
          ? ".slow-detail-page .slow-detail-hero > img"
            : isVirtualTarget
              ? ".virtual-detail-page .virtual-detail-hero > img"
            : isFilterTarget
              ? ".filter-detail-page .filter-detail-hero-image"
              : isTogoTarget
                ? ".togo-detail-page .togo-detail-hero > img"
                : isViewTarget
                  ? ".view-detail-page .view-detail-hero > img"
                  : isMenuTarget
                    ? ".menu-detail-page .menu-detail-hero > img"
                    : isMusicTarget
                      ? ".music-detail-page .music-detail-hero > img"
                      : isBlindboxTarget
                        ? ".blindbox-detail-page .blindbox-detail-hero > img"
                        : isScreenTarget
                          ? ".screen-detail-page .screen-detail-hero > img"
                          : ".poison-detail-page .poison-detail-hero > img",
  );
  detailPage?.scrollTo({ top: 0, behavior: "auto" });
  const targetMedia = targetImage?.tagName === "IMG" ? targetImage : targetImage?.querySelector?.("img");
  await waitForTransitionImage(targetMedia);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const measuredTargetRect = targetImage?.getBoundingClientRect();
      document.body.classList.remove("is-line-transition-measuring");
      document.body.classList.remove(
        isLineTarget
          ? "is-line-detail"
          : isHappyTarget
            ? "is-happy-detail"
            : isSlowTarget
              ? "is-slow-detail"
              : isVirtualTarget
                ? "is-virtual-detail"
                : isFilterTarget
                  ? "is-filter-detail"
                  : isTogoTarget
                    ? "is-togo-detail"
                    : isViewTarget
                      ? "is-view-detail"
                      : isMenuTarget
                        ? "is-menu-detail"
                        : isMusicTarget
                          ? "is-music-detail"
                          : isBlindboxTarget
                            ? "is-blindbox-detail"
                            : isScreenTarget
                              ? "is-screen-detail"
                              : "is-poison-detail",
      );
      document.body.classList.remove("is-work-detail");

      const targetRect =
        measuredTargetRect && measuredTargetRect.width && measuredTargetRect.height
          ? measuredTargetRect
          : getFallbackWorkHeroRect();
      const measuredViewportWidth = window.innerWidth;

      const deltaX = targetRect.left - sourceRect.left;
      if (Math.abs(deltaX) < 1 && Math.abs(targetRect.top - sourceRect.top) < 1) {
        window.location.hash = targetRoute.slice(1);
        clearLineHeroTransition();
        return;
      }

      animateWorkHeroClone(
        clone,
        sourceRect,
        () => (window.innerWidth === measuredViewportWidth ? targetRect : getFallbackWorkHeroRect()),
        targetRoute,
        sourceFilter,
      );
    });
  });
};

window.startLineHeroTransitionFromLink = (sourceLink, event) => {
  if (event?.lineHeroTransitionHandled) return false;
  event?.preventDefault();
  if (event) event.lineHeroTransitionHandled = true;
  if (!sourceLink?.dataset?.route) return false;
  playWorkHeroTransition(sourceLink);
  return false;
};

const syncRoute = () => {
  const route = window.location.hash;
  const isHomeRoute = route === "" || route === "#";
  const isWorksRoute = route === "#works";
  const isAboutRoute = route === "#about";
  const isContactRoute = route === "#contact";
  const isLineDetail = route === "#work-line";
  const isHappyDetail = route === "#work-happy";
  const isSlowDetail = route === "#work-slow";
  const isVirtualDetail = route === "#work-virtual";
  const isPoisonDetail = route === "#work-poison";
  const isFilterDetail = route === "#work-filter";
  const isTogoDetail = route === "#work-togo";
  const isViewDetail = route === "#work-view";
  const isMenuDetail = route === "#work-menu";
  const isMusicDetail = route === "#work-music";
  const isBlindboxDetail = route === "#work-blindbox";
  const isScreenDetail = route === "#work-screen";
  const isWorkDetail =
    isLineDetail ||
    isHappyDetail ||
    isSlowDetail ||
    isVirtualDetail ||
    isPoisonDetail ||
    isFilterDetail ||
    isTogoDetail ||
    isViewDetail ||
    isMenuDetail ||
    isMusicDetail ||
    isBlindboxDetail ||
    isScreenDetail;
  if (!isWorkDetail) {
    clearLineHeroTransition();
  }
  document.body.classList.toggle("is-home", isHomeRoute);
  if (isHomeRoute && !wasHomeRoute) {
    document.documentElement.classList.remove("is-home-load");
    document.body.classList.remove("is-home-entering");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (document.body.classList.contains("is-home")) {
          document.body.classList.add("is-home-entering");
        }
      });
    });
  } else if (!isHomeRoute) {
    document.body.classList.remove("is-home-entering");
    document.documentElement.classList.remove("is-home-load");
  }
  wasHomeRoute = isHomeRoute;
  document.body.classList.toggle("is-about", isAboutRoute);
  if (isAboutRoute && !wasAboutRoute) {
    document.body.classList.remove("is-about-entering");
    aboutPage?.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (document.body.classList.contains("is-about")) {
          document.body.classList.add("is-about-entering");
        }
      });
    });
  } else if (!isAboutRoute) {
    document.body.classList.remove("is-about-entering");
  }
  wasAboutRoute = isAboutRoute;
  document.body.classList.toggle("is-contact", isContactRoute);
  if (isContactRoute && !wasContactRoute) {
    document.body.classList.remove("is-contact-entering");
    contactPage?.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (document.body.classList.contains("is-contact")) {
          document.body.classList.add("is-contact-entering");
        }
      });
    });
  } else if (!isContactRoute) {
    document.body.classList.remove("is-contact-entering");
  }
  wasContactRoute = isContactRoute;
  document.body.classList.toggle("is-works", isWorksRoute);
  if (isWorksRoute && !wasWorksRoute) {
    clearProgrammaticWorksFocus();
    heldWorksSection = "";
    worksPage?.scrollTo({ top: 0, behavior: "auto" });
    requestWorksBlurUpdate();
  }
  wasWorksRoute = isWorksRoute;
  document.body.classList.toggle("is-work-detail", isWorkDetail);
  document.body.classList.toggle("is-line-detail", isLineDetail);
  document.body.classList.toggle("is-happy-detail", isHappyDetail);
  document.body.classList.toggle("is-slow-detail", isSlowDetail);
  document.body.classList.toggle("is-virtual-detail", isVirtualDetail);
  document.body.classList.toggle("is-poison-detail", isPoisonDetail);
  document.body.classList.toggle("is-filter-detail", isFilterDetail);
  document.body.classList.toggle("is-togo-detail", isTogoDetail);
  document.body.classList.toggle("is-view-detail", isViewDetail);
  document.body.classList.toggle("is-menu-detail", isMenuDetail);
  document.body.classList.toggle("is-music-detail", isMusicDetail);
  document.body.classList.toggle("is-blindbox-detail", isBlindboxDetail);
  document.body.classList.toggle("is-screen-detail", isScreenDetail);
  if (isWorkDetail) {
    document
      .querySelector(
        isLineDetail
          ? ".line-detail-page"
          : isHappyDetail
            ? ".happy-detail-page"
            : isSlowDetail
            ? ".slow-detail-page"
            : isVirtualDetail
              ? ".virtual-detail-page"
              : isPoisonDetail
                ? ".poison-detail-page"
                : isFilterDetail
                  ? ".filter-detail-page"
                  : isTogoDetail
                    ? ".togo-detail-page"
                    : isViewDetail
                      ? ".view-detail-page"
                      : isMenuDetail
                        ? ".menu-detail-page"
                        : isMusicDetail
                          ? ".music-detail-page"
                          : isBlindboxDetail
                            ? ".blindbox-detail-page"
                            : ".screen-detail-page",
      )
      ?.scrollTo({
        top: 0,
        behavior: "auto",
      });
  }
  syncWorkDetailCopyright();
  requestWorksBlurUpdate();
  requestWorkDetailTextSqueezeUpdate();
};

const syncWorksBlur = () => {
  if (!blurWorksItems.length || !document.body.classList.contains("is-works")) return;
  const viewportCenter = window.innerHeight / 2;
  const clarityRange = window.innerHeight * 0.85;
  const clearHold = window.innerHeight * 0.08;
  const focusRange = window.innerHeight * 0.46;
  const easeProgress = (value) => {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped * clamped * (3 - 2 * clamped);
  };
  let activeSection = "TOP";
  const sectionStarts = [
    [0, "Installation"],
    [3, "Video Art"],
    [6, "UI/UX Design"],
    [8, "Graphic Design"],
    [9, "Others"],
  ];

  const itemRects = blurWorksItems.map((item) => item.getBoundingClientRect());
  const firstMoreRect = itemRects[0];
  const topBlurProgress = firstMoreRect
    ? Math.max(0, Math.min(1, (window.innerHeight - firstMoreRect.top) / (window.innerHeight * 0.85)))
    : 0;
  const topBlur = topBlurProgress * topBlurProgress * (3 - 2 * topBlurProgress) * maxWorksBlur;
  const roundedTopBlur = Math.round(topBlur * 2) / 2;
  const topFilter = roundedTopBlur > 0.25 ? `blur(${roundedTopBlur.toFixed(1)}px)` : "";
  staticWorksImages.forEach((image) => {
    if (image.style.filter !== topFilter) image.style.filter = topFilter;
  });
  const overlayFilter = topFilter || "none";
  if (worksBoard && worksBoard.style.getPropertyValue("--work-hover-overlay-filter") !== overlayFilter) {
    worksBoard.style.setProperty("--work-hover-overlay-filter", overlayFilter);
  }

  let focusedMoreIndex = programmaticWorksFocusIndex;
  let closestDistance = Infinity;

  if (focusedMoreIndex < 0) {
    blurWorksItems.forEach((item, index) => {
      const rect = itemRects[index];
      const itemCenter = rect.top + rect.height / 2;
      const distance = Math.abs(itemCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        focusedMoreIndex = index;
      }
    });
  }

  blurWorksItems.forEach((item, index) => {
    const image = blurWorksImages[index];
    if (!image) return;

    const rect = itemRects[index];
    const itemCenter = rect.top + rect.height / 2;
    const distance = Math.abs(itemCenter - viewportCenter);
    const easedDistance = Math.max(0, distance - clearHold);
    const clarity = easeProgress(1 - easedDistance / clarityRange);
    const blur = index === focusedMoreIndex ? (1 - clarity) * maxWorksBlur : maxWorksBlur;
    const { baseWidth, horizontalTargetWidth, verticalTargetWidth } = getWorksMoreSizing();
    const targetWidth = image.naturalWidth > image.naturalHeight ? horizontalTargetWidth : verticalTargetWidth;
    const focusProgress = index === focusedMoreIndex ? easeProgress(1 - easedDistance / focusRange) : 0;
    const width = Math.round((baseWidth + focusProgress * (targetWidth - baseWidth)) * 2) / 2;
    const nextWidth = `${width.toFixed(1)}px`;

    if (item.style.width !== nextWidth) item.style.width = nextWidth;
    const nextZIndex = String(Math.round(clarity * 100));
    if (item.style.zIndex !== nextZIndex) item.style.zIndex = nextZIndex;
    const roundedBlur = Math.round(blur * 2) / 2;
    const nextFilter = roundedBlur > 0.25 ? `blur(${roundedBlur.toFixed(1)}px)` : "";
    if (image.style.filter !== nextFilter) image.style.filter = nextFilter;

  });

  sectionStarts.forEach(([index, section]) => {
    const item = blurWorksItems[index];
    if (!item) return;

    const rect = itemRects[index];
    const itemCenter = rect.top + rect.height / 2;

    if (itemCenter <= viewportCenter + clearHold) {
      activeSection = section;
    }
  });

  const shownSection = heldWorksSection || activeSection;
  setWorksActiveSection(shownSection);
  syncWorksProjectText(focusedMoreIndex, shownSection);
};

const requestWorksBlurUpdate = () => {
  if (worksBlurFrame || !document.body.classList.contains("is-works")) return;

  worksBlurFrame = window.requestAnimationFrame(() => {
    worksBlurFrame = 0;
    syncWorksBlur();
  });
};

const clearProgrammaticWorksFocus = () => {
  programmaticWorksFocusIndex = -1;
};

const getMoreItemMetrics = (targetIndex, scale) => {
  const targetMoreItem = blurWorksItems[targetIndex];
  const worksMore = document.querySelector(".works-more");

  if (!targetMoreItem || !worksMore) return { center: 0, bottom: 0 };

  const itemGap = 35;
  const { baseWidth, horizontalTargetWidth, verticalTargetWidth } = getWorksMoreSizing();
  const items = blurWorksItems.map((item) => {
    const image = item.querySelector("img");
    const isHorizontal = image && image.naturalWidth > image.naturalHeight;
    const targetWidth = isHorizontal ? horizontalTargetWidth : verticalTargetWidth;
    const aspect =
      image && image.naturalWidth
        ? image.naturalHeight / image.naturalWidth
        : item.offsetHeight / Math.max(item.offsetWidth, 1);

    return { aspect, targetWidth, width: baseWidth };
  });

  let top = worksMore.offsetTop;
  let targetCenter = 0;
  let targetBottom = 0;

  items.forEach((item, index) => {
    const width = index === targetIndex ? item.targetWidth : baseWidth;
    const height = width * item.aspect;
    const center = top + height / 2;

    if (index === targetIndex) {
      targetCenter = center;
      targetBottom = top + height;
    }

    top += height + itemGap;
  });

  return { center: targetCenter, bottom: targetBottom };
};

const getMoreItemCenter = (targetIndex, scale) => getMoreItemMetrics(targetIndex, scale).center;

const updateWorksBoardHeight = (scale) => {
  if (!blurWorksItems.length) return;

  const viewportHeight = getLayoutViewportHeight();
  const viewportHeightInBoard = viewportHeight / scale;
  const lastMetrics = getMoreItemMetrics(blurWorksItems.length - 1, scale);
  const lastCenter = lastMetrics.center;
  const lastBottom = lastMetrics.bottom;
  if (!lastCenter) return;

  const bottomPadding = 120;
  const boardHeight = Math.max(lastCenter + viewportHeightInBoard / 2, lastBottom + bottomPadding / scale);
  const scrollHeight = Math.max(lastCenter * scale + viewportHeight / 2, lastBottom * scale + bottomPadding);

  document.documentElement.style.setProperty("--works-board-height", `${boardHeight}px`);
  document.documentElement.style.setProperty("--works-scroll-height", `${scrollHeight}px`);
};

const scrollWorksToSection = (section) => {
  if (!worksPage) return;

  heldWorksSection = section;
  enabledWorksDetailsSection = worksDetailSections[section] ? section : "";
  window.clearTimeout(worksActiveHoldTimer);
  window.clearTimeout(worksScrollCorrection);
  setWorksActiveSection(section);

  const sectionTargets = {
    TOP: null,
    Installation: 0,
    "Video Art": 3,
    "UI/UX Design": 6,
    "Graphic Design": 8,
    Others: 9,
  };
  const targetIndex = sectionTargets[section];

  if (targetIndex === null || targetIndex === undefined) {
    clearProgrammaticWorksFocus();
    requestWorksBlurUpdate();
    worksPage.scrollTo({ top: 0, behavior: "smooth" });
    worksActiveHoldTimer = window.setTimeout(() => {
      heldWorksSection = "";
      requestWorksBlurUpdate();
    }, 1400);
    return;
  }
  programmaticWorksFocusIndex = targetIndex;
  requestWorksBlurUpdate();

  const scale = getWorksScale();
  const targetCenter = getMoreItemCenter(targetIndex, scale);
  const maxScroll = worksPage.scrollHeight - worksPage.clientHeight;
  const targetTop = Math.max(0, Math.min(maxScroll, targetCenter * scale - getLayoutViewportHeight() / 2));

  worksPage.scrollTo({ top: targetTop, behavior: "smooth" });
  worksScrollCorrection = window.setTimeout(() => {
    const item = blurWorksItems[targetIndex];
    if (!item) return;

    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;
    const correction = (itemCenter - window.innerHeight / 2) / siteScale;
    const currentMaxScroll = worksPage.scrollHeight - worksPage.clientHeight;
    worksPage.scrollTo({
      top: Math.max(0, Math.min(currentMaxScroll, worksPage.scrollTop + correction)),
      behavior: "auto",
    });
    setWorksActiveSection(section);
    worksActiveHoldTimer = window.setTimeout(() => {
      heldWorksSection = "";
      clearProgrammaticWorksFocus();
      requestWorksBlurUpdate();
    }, 300);
    requestWorksBlurUpdate();
  }, 1400);
};

const scrollWorksToDetailItem = (localIndex) => {
  if (!worksPage) return;
  const details = worksDetailSections[enabledWorksDetailsSection];
  if (!details) return;

  const section = enabledWorksDetailsSection;
  const targetIndex = details.startIndex + localIndex;
  heldWorksSection = section;
  window.clearTimeout(worksActiveHoldTimer);
  window.clearTimeout(worksScrollCorrection);
  setWorksActiveSection(section);
  syncWorksProjectText(targetIndex, section);
  programmaticWorksFocusIndex = targetIndex;
  requestWorksBlurUpdate();

  const scale = getWorksScale();
  const targetCenter = getMoreItemCenter(targetIndex, scale);
  const maxScroll = worksPage.scrollHeight - worksPage.clientHeight;
  const targetTop = Math.max(0, Math.min(maxScroll, targetCenter * scale - getLayoutViewportHeight() / 2));

  worksPage.scrollTo({ top: targetTop, behavior: "smooth" });
  worksScrollCorrection = window.setTimeout(() => {
    const item = blurWorksItems[targetIndex];
    if (!item) return;

    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;
    const correction = (itemCenter - window.innerHeight / 2) / siteScale;
    const currentMaxScroll = worksPage.scrollHeight - worksPage.clientHeight;
    worksPage.scrollTo({
      top: Math.max(0, Math.min(currentMaxScroll, worksPage.scrollTop + correction)),
      behavior: "auto",
    });
    setWorksActiveSection(section);
    worksActiveHoldTimer = window.setTimeout(() => {
      heldWorksSection = "";
      clearProgrammaticWorksFocus();
      requestWorksBlurUpdate();
    }, 300);
    requestWorksBlurUpdate();
  }, 1400);
};

const syncWorksScale = () => {
  if (!worksBoard) return;
  const baseWidth = 1518;
  const baseHeight = 985;
  const galleryLeft = 308;
  const pageRight = 52;
  const itemGap = 15;
  const baseColumnWidths = [196, 196, 142, 141, 196, 196];
  const baseHeights = [
    [156, 131, 214, 201, 110, 135],
    [154, 110, 184, 141, 130, 148],
  ];
  const viewportWidth = getLayoutViewportWidth();
  const viewportHeight = getLayoutViewportHeight();
  const scale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight, 1);
  const boardWidth = Math.max(baseWidth, (viewportWidth - pageRight) / scale + pageRight);
  const galleryWidth = boardWidth - galleryLeft - pageRight;
  const baseTotal = baseColumnWidths.reduce((sum, width) => sum + width, 0);
  const itemScale = (galleryWidth - itemGap * 5) / baseTotal;
  const columnWidths = baseColumnWidths.map((width) => width * itemScale);
  const columnLefts = columnWidths.reduce((lefts, width, index) => {
    lefts.push(index === 0 ? 0 : lefts[index - 1] + columnWidths[index - 1] + itemGap);
    return lefts;
  }, []);
  const firstRowHeights = baseHeights[0].map((height) => height * itemScale);
  const secondRowTop = Math.max(294, Math.max(...firstRowHeights) + 77);
  const galleryContentHeight = secondRowTop + Math.max(...baseHeights[1].map((height) => height * itemScale));
  const referenceViewportHeight = 900;
  const referenceScale = Math.min(layoutWidth / baseWidth, referenceViewportHeight / baseHeight, 1);
  const referenceGalleryTop = 287;
  const galleryCenterOffset =
    (referenceGalleryTop + galleryContentHeight / 2) * referenceScale - referenceViewportHeight / 2;
  const galleryTop =
    (window.innerHeight / 2 + galleryCenterOffset) / (siteScale * scale) - galleryContentHeight / 2;
  const worksMoreTop = galleryTop + 917;

  document.documentElement.style.setProperty("--works-scale", String(scale));
  document.documentElement.style.setProperty("--works-board-width", `${boardWidth}px`);
  document.documentElement.style.setProperty("--works-gallery-top", `${galleryTop}px`);
  document.documentElement.style.setProperty("--works-more-top", `${worksMoreTop}px`);
  updateWorksBoardHeight(scale);

  worksItems.forEach((item, index) => {
    const row = index < 6 ? 0 : 1;
    const column = index % 6;

    item.style.left = `${columnLefts[column]}px`;
    item.style.top = row === 0 ? "0px" : `${secondRowTop}px`;
    item.style.width = `${columnWidths[column]}px`;
    item.style.height = `${baseHeights[row][column] * itemScale}px`;
  });
};

if (menuButton && menuOverlay) {
  const setMenuOpen = (isOpen) => {
    document.body.classList.toggle("is-menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    menuOverlay.setAttribute("aria-hidden", String(!isOpen));
  };

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(!document.body.classList.contains("is-menu-open"));
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("href");

      if (target === "#about") {
        aboutPage?.scrollTo({ top: 0, behavior: "auto" });
      }

      if (target === "#contact") {
        contactPage?.scrollTo({ top: 0, behavior: "auto" });
      }

      if (target === "#works") {
        resetWorksToTop();
      }

      setMenuOpen(false);
    });
  });

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-disabled") === "true") return;
      setLanguage(button.dataset.lang);
      setMenuOpen(false);
    });
  });

  if (new URLSearchParams(window.location.search).has("previewMenu")) {
    setMenuOpen(true);
  }
}

window.addEventListener("hashchange", syncRoute);
window.addEventListener("wheel", forwardWheelToActivePage, { passive: false });
worksPage?.addEventListener("scroll", requestWorksBlurUpdate, { passive: true });
workDetailPages.forEach((page) => {
  page.addEventListener("scroll", syncWorkDetailCopyright, { passive: true });
});
worksPage?.addEventListener(
  "wheel",
  () => {
    if (programmaticWorksFocusIndex >= 0) {
      clearProgrammaticWorksFocus();
      requestWorksBlurUpdate();
    }
  },
  { passive: true },
);
worksPage?.addEventListener(
  "touchstart",
  () => {
    if (programmaticWorksFocusIndex >= 0) {
      clearProgrammaticWorksFocus();
      requestWorksBlurUpdate();
    }
  },
  { passive: true },
);
worksFilterLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    scrollWorksToSection(link.textContent.trim());
  });
});
worksProjectListItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (item.hidden) return;
    scrollWorksToDetailItem(index);
  });
});
document.addEventListener(
  "click",
  (event) => {
    const item = event.target.closest?.('.works-page [data-route^="#work-"]');
    if (!item) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.lineHeroTransitionHandled = true;
    playWorkHeroTransition(item);
  },
  true,
);
window.addEventListener("resize", () => {
  if (resizeFrame) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    syncSiteScale();
    syncWorksScale();
    requestWorkDetailTextSqueezeUpdate();
    requestWorkDetailScaleMarginUpdate();
    requestWorksBlurUpdate();
  });
});
blurWorksItems.forEach((item) => {
  const image = item.querySelector("img");

  if (image && !image.complete) {
    image.addEventListener("load", syncWorksScale, { once: true });
  }
});
syncRoute();
syncWorksScale();
requestWorksBlurUpdate();
requestWorkDetailScaleMarginUpdate();
requestWorkDetailTextSqueezeUpdate();
initNetworkBackground();

if (card) {
  const resetDraw = () => {
    clearTimeout(drawTimer);
    card.classList.remove("is-open", "is-lifting");
    card.removeAttribute("data-selected");
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", "抽取纸签");
  };

  card.addEventListener("click", (event) => {
    event.stopPropagation();

    if (card.classList.contains("is-open") || card.classList.contains("is-lifting")) {
      resetDraw();
      return;
    }

    let selected = String(Math.floor(Math.random() * 5) + 1);

    if (selected === lastSelected) {
      selected = String((Number(selected) % 5) + 1);
    }

    lastSelected = selected;
    resetDraw();

    requestAnimationFrame(() => {
      card.getBoundingClientRect();

      requestAnimationFrame(() => {
        card.dataset.selected = selected;
        card.classList.add("is-lifting");
        card.setAttribute("aria-pressed", "true");
        card.setAttribute("aria-label", "重新抽取纸签");

        drawTimer = window.setTimeout(() => {
          card.classList.remove("is-lifting");
          card.classList.add("is-open");
        }, 620);
      });
    });

    card.blur();
    window.scrollTo(0, 0);
  });

  document.addEventListener("click", () => {
    if (card.classList.contains("is-open") || card.classList.contains("is-lifting")) {
      resetDraw();
    }
  });

  if (new URLSearchParams(window.location.search).has("previewOpen")) {
    card.dataset.selected = "1";
    card.classList.add("is-open");
    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", "重新抽取纸签");
  }

  window.addEventListener("beforeunload", () => {
    clearTimeout(drawTimer);
  });
}
