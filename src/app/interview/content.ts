/**
 * Copy for the /interview ad landing page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  ⚠  PLACEHOLDER COPY — NOT APPROVED. DO NOT PUT THIS IN FRONT OF NAPARAT.
 *
 *  The task spec (agent_tasks 26752f36) says the full Thai copy lives in
 *  /mnt/user-data/outputs/interview-landing-page.md and must be used VERBATIM.
 *  That path is Claude-chat's sandbox and is not reachable from this repo, so
 *  the Thai below was written here instead. It has NOT been through Chris or
 *  Naparat. Task 3745fb43 asks for the real file.
 *
 *  Everything user-facing on the page reads from this one module precisely so
 *  that swapping in the approved copy is a single-file edit with no layout
 *  work. Keep it that way — do not inline strings into the page component.
 *
 *  TWO EXCEPTIONS, both genuinely approved and already shipped in the ad:
 *    - heroH1 is the ad's own hook, lifted verbatim from
 *      scripts/build-interview-video.mjs (THAI_HOOK). The visitor read that
 *      exact sentence seconds ago; matching it is the whole point of the page.
 *    - The trial terms are copied verbatim from LandingContent.tsx, where they
 *      are already live. Do not reword them here — they are a legal statement
 *      and the two pages must not disagree.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Shape is identical for TH and EN so the page can switch locale with one
 * ternary, exactly like LandingContent.
 */

export type QuestionCard = {
  /** The English question, as an examiner would ask it. */
  question: string;
  /** A model answer the child can actually say. */
  answer: string;
  /** What the examiner is really listening for. */
  listen: string;
  /** The mistake Thai children most often make here. */
  mistake: string;
  /** What to do at home this week. */
  practise: string;
  /** Still from the ad creative — same image the visitor just watched. */
  image: string;
  /** Alt text. Describes the picture, not the question. */
  alt: string;
};

const IMAGES = [
  "/interview/interview-01.jpg",
  "/interview/interview-02.jpg",
  "/interview/interview-03.jpg",
  "/interview/interview-04.jpg",
  "/interview/interview-05.jpg",
];

/** Widened so EN can reuse `typeof TH` as its own type. */
type Locale = "th" | "en";

export const TH = {
  lang: "th" as Locale,
  toggle: "EN",
  login: "เข้าสู่ระบบ",
  footerPrivacy: "นโยบายความเป็นส่วนตัว",
  footerTerms: "ข้อกำหนดการใช้งาน",

  // ── Hero. No CTA here by design: the visitor came for the questions, and
  //    asking for anything before delivering them is what broke the last page.
  heroH1: "5 คำถามที่เด็กมักเจอในการสอบสัมภาษณ์เข้าโรงเรียน",
  heroSub:
    "พร้อมคำตอบตัวอย่าง สิ่งที่กรรมการฟังจริง ๆ ข้อผิดพลาดที่เด็กไทยมักทำ และวิธีฝึกที่บ้าน อ่านได้เลยทั้งหมด ไม่ต้องสมัคร ไม่ต้องกรอกอะไร",
  heroBadge: "อ่านฟรี ไม่ต้องสมัครสมาชิก",

  questionsH2: "คำถามทั้ง 5 ข้อ",
  labelAnswer: "คำตอบตัวอย่าง",
  labelListen: "กรรมการฟังอะไร",
  labelMistake: "ข้อผิดพลาดที่พบบ่อย",
  labelPractise: "ฝึกที่บ้านแบบนี้",

  questions: [
    {
      question: "What is your name?",
      answer: "My name is Ploy.",
      listen:
        "กรรมการฟังว่าเด็กตอบเป็นประโยคเต็มได้ไหม และออกเสียงชื่อตัวเองได้ชัดเจนหรือเปล่า ข้อนี้เป็นข้อแรกเสมอ เพราะเป็นข้อที่ใช้วัดว่าเด็กกล้าเปิดปากพูดหรือไม่",
      mistake:
        "เด็กส่วนใหญ่ตอบแค่ชื่อเล่นคำเดียว ซึ่งไม่ผิด แต่เสียโอกาสแสดงให้เห็นว่าพูดเป็นประโยคภาษาอังกฤษได้",
      practise:
        "ให้ลูกฝึกตอบเป็นประโยคเต็มว่า My name is ___ วันละ 2-3 ครั้ง ลองสลับถามด้วยน้ำเสียงและจังหวะที่ต่างกัน เพื่อให้ลูกไม่ได้จำแค่เสียงของคุณ",
      image: IMAGES[0],
      alt: "เด็กหญิงยืนเอามือแตะอกขณะแนะนำตัวเองในห้องเรียน",
    },
    {
      question: "How old are you?",
      answer: "I am six years old.",
      listen:
        "กรรมการฟังตัวเลขอายุเป็นภาษาอังกฤษ และฟังว่าเด็กพูดคำว่า years old ต่อท้ายได้ไหม",
      mistake:
        "เด็กมักชูนิ้วบอกอายุแทนการพูด หรือพูดแค่ตัวเลขลอย ๆ ว่า six การชูนิ้วอย่างเดียวทำให้กรรมการไม่ได้ยินภาษาอังกฤษเลย",
      practise:
        "ฝึกให้ลูกพูดพร้อมชูนิ้วไปด้วยในช่วงแรก แล้วค่อย ๆ ให้เอามือลงเมื่อพูดได้คล่างขึ้น ทบทวนตัวเลข 1-10 ควบคู่กันไป",
      image: IMAGES[1],
      alt: "เด็กหญิงชูนิ้วมือบอกอายุของตัวเอง",
    },
    {
      question: "What is your favourite colour?",
      answer: "My favourite colour is blue.",
      listen:
        "กรรมการฟังชื่อสีเป็นภาษาอังกฤษ และดูว่าเด็กเข้าใจคำว่า favourite หรือไม่ คำนี้จะโผล่มาอีกหลายข้อในการสัมภาษณ์",
      mistake:
        "เด็กรู้ชื่อสีดี แต่ไม่รู้จักคำว่า favourite เลยเงียบไปทั้งข้อ ทั้งที่จริง ๆ ตอบได้",
      practise:
        "สอนคำว่า favourite ว่าแปลว่าชอบที่สุด แล้วใช้คำนี้กับหลาย ๆ เรื่อง เช่น สี อาหาร สัตว์ ของเล่น ให้ลูกคุ้นกับตัวคำถาม ไม่ใช่แค่คำตอบ",
      image: IMAGES[2],
      alt: "เด็กหญิงนั่งชี้ไปที่สีเทียนหลากสีบนโต๊ะ",
    },
    {
      question: "Do you have any brothers or sisters?",
      answer: "Yes, I have one brother. / No, I don't.",
      listen:
        "กรรมการฟังคำว่า Yes หรือ No เป็นอันดับแรก แล้วจึงฟังจำนวนและคำว่า brother หรือ sister ข้อนี้วัดว่าเด็กแยกคำถามแบบ yes/no ออกหรือไม่",
      mistake:
        "เด็กตอบเป็นตัวเลขทันที เช่น One ทำให้ฟังเหมือนไม่เข้าใจคำถาม ทั้งที่เข้าใจดี",
      practise:
        "ฝึกคำถาม Do you...? หลาย ๆ แบบ โดยให้ลูกตอบ Yes หรือ No ก่อนเสมอ แล้วค่อยเติมรายละเอียด ฝึกทั้งกรณีมีพี่น้องและไม่มี",
      image: IMAGES[3],
      alt: "เด็กหญิงยืนโอบไหล่น้องชายตัวเล็กกว่า",
    },
    {
      question: "What do you like to do?",
      answer: "I like to draw.",
      listen:
        "กรรมการฟังคำกริยาที่ตามหลัง I like to ข้อนี้เปิดกว้างที่สุด และเป็นข้อที่กรรมการใช้ดูว่าเด็กพูดต่อเองได้ไหม",
      mistake:
        "เด็กตอบเป็นคำนามคำเดียว เช่น Football แทนที่จะเป็น I like to play football ซึ่งฟังดูเหมือนท่องจำมามากกว่าเข้าใจ",
      practise:
        "เลือกกิจกรรมที่ลูกชอบจริง ๆ 3 อย่าง แล้วฝึกพูดเป็นประโยคเต็มทั้งสามอย่าง คำตอบที่มาจากเรื่องจริงของเด็ก จะพูดออกมาเป็นธรรมชาติกว่าคำตอบที่ท่องมา",
      image: IMAGES[4],
      alt: "เด็กหญิงนั่งวาดรูประบายสีที่โต๊ะ",
    },
  ] as QuestionCard[],

  // ── General advice
  adviceH2: "สิ่งที่ควรรู้ก่อนวันสัมภาษณ์",
  adviceIntro:
    "กรรมการไม่ได้มองหาเด็กที่พูดถูกทุกคำ แต่มองหาเด็กที่เข้าใจคำถามและกล้าตอบ",
  adviceItems: [
    {
      emoji: "🗣️",
      title: "ตอบเป็นประโยค ดีกว่าตอบคำเดียว",
      body: "คำเดียวไม่ผิด แต่ประโยคเต็มแสดงว่าเด็กใช้ภาษาได้ ไม่ใช่แค่จำคำศัพท์ได้",
    },
    {
      emoji: "👂",
      title: "ฝึกฟังคำถาม ไม่ใช่ท่องคำตอบ",
      body: "เด็กที่ท่องคำตอบมาจะไปต่อไม่ถูกทันทีที่กรรมการเปลี่ยนคำถามเล็กน้อย ให้สลับลำดับคำถามและเปลี่ยนคำพูดบ้างเวลาฝึก",
    },
    {
      emoji: "🙂",
      title: "สบตาและยิ้ม มีผลจริง",
      body: "กรรมการให้คะแนนความมั่นใจด้วย เด็กที่มองหน้าและยิ้มได้ จะดูเข้าใจมากกว่าเด็กที่ก้มหน้าตอบถูก",
    },
    {
      emoji: "⏱️",
      title: "วันละ 5 นาที ดีกว่าอัดวันเดียว",
      body: "ฝึกสั้น ๆ แต่ทุกวัน ได้ผลกว่าฝึกหนักครั้งเดียวก่อนสอบ และเด็กไม่เครียด",
    },
    {
      emoji: "🤫",
      title: "อย่าแปลให้ระหว่างฝึก",
      body: "ถ้าลูกไม่เข้าใจ ให้ถามซ้ำช้าลง หรือใช้ท่าทางประกอบ การแปลเป็นไทยทันทีทำให้เด็กรอคำแปลแทนที่จะฟังภาษาอังกฤษ",
    },
  ],

  // ── Email capture (worksheet)
  printableH2: "รับใบงานฝึก 20 คำถาม ไปพิมพ์ที่บ้าน",
  printableBody:
    "ไฟล์ PDF สำหรับพิมพ์ A4 2 หน้า รวม 5 คำถามข้างบน และอีก 20 ข้อ พร้อมช่องเขียนคำตอบและช่องติ๊กเวลาฝึกแต่ละครั้ง ออกแบบให้พิมพ์ขาวดำที่บ้านได้ ไม่เปลืองหมึกสี",
  printablePlaceholder: "อีเมลของคุณ",
  printableCta: "ส่งใบงานให้ฉัน",
  printableSending: "กำลังส่ง...",
  printableSuccess:
    "ส่งแล้ว! กรุณาตรวจสอบอีเมลของคุณ หากไม่พบ ลองดูในโฟลเดอร์จดหมายขยะ",
  printableError: "ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  // Shown on a 503, i.e. the daily send ceiling. Deliberately different from
  // printableError: nothing is wrong with what they typed, and retrying now
  // will not help.
  printableBusy: "ตอนนี้มีคำขอเข้ามาจำนวนมาก กรุณาลองใหม่ในภายหลัง",
  printableInvalid: "กรุณากรอกอีเมลให้ถูกต้อง",
  printablePrivacy:
    "เราส่งใบงานให้ทางอีเมลเท่านั้น ยกเลิกรับอีเมลได้ทุกเมื่อจากลิงก์ท้ายอีเมล",

  // ── The offer. Only after the value above has been delivered.
  offerH2: "ถ้าอยากให้ลูกฝึกต่อทุกวัน",
  offerBody:
    "English Allstars คือแอปเรียนภาษาอังกฤษสำหรับเด็กไทยอายุ 4-8 ปี ที่กำลังเตรียมสอบเข้าโรงเรียนหลักสูตรภาษาอังกฤษ สร้างโดยอาจารย์สอนภาษาอังกฤษชาวอเมริกันที่อาศัยอยู่ในประเทศไทย และมีลูกที่ต้องสอบเข้าแบบเดียวกับลูกของคุณ",
  offerItems: [
    {
      emoji: "📚",
      title: "บัตรคำศัพท์พร้อมภาพประกอบ",
      desc: "ทีละคำ พร้อมเสียงอ่านจากเจ้าของภาษา",
      screenshot: "/screenshot-flashcard.webp",
    },
    {
      emoji: "✅",
      title: "แบบทดสอบ",
      desc: "สุ่มข้อไม่ซ้ำกันในแต่ละครั้ง พร้อมถ้วยรางวัลเมื่อทำครบ",
      screenshot: "/screenshot-quiz.webp",
    },
    {
      emoji: "📖",
      title: "หัวข้อครบทุกด้าน",
      desc: "คำศัพท์ นิทานอ่านตาม แบบทดสอบ และข้อสอบเสมือนจริง",
      screenshot: "/screenshot-subjects.webp",
    },
  ],
  offerCta: "ทดลองใช้ฟรี 7 วัน",

  // ── Trial terms. Verbatim from LandingContent.tsx — do not reword.
  trialHeadline: "ไม่มีการเรียกเก็บเงินใน 7 วันแรก",
  trialTerms:
    "ต้องใช้บัตรเครดิตหรือบัตรเดบิตเพื่อเริ่มทดลองใช้ ทดลองฟรี 7 วัน หลังจากนั้นระบบจะเรียกเก็บเงิน 750 บาทต่อเดือนโดยอัตโนมัติ ยกเลิกได้ตลอดเวลาก่อนครบ 7 วัน โดยไม่มีค่าใช้จ่าย",
  contactPrompt: "มีคำถาม?",
  contactLink: "ติดต่อเรา",
};

export const EN: typeof TH = {
  lang: "en",
  toggle: "TH",
  login: "Log in",
  footerPrivacy: "Privacy Policy",
  footerTerms: "Terms of Use",

  heroH1: "The 5 questions children are most often asked at school interviews",
  heroSub:
    "With model answers, what the examiners are actually listening for, the mistakes Thai children most often make, and how to practise at home. All of it below — no signup, nothing to fill in.",
  heroBadge: "Free to read · no account needed",

  questionsH2: "All five questions",
  labelAnswer: "Model answer",
  labelListen: "What the examiner listens for",
  labelMistake: "The common mistake",
  labelPractise: "Practise it like this",

  questions: [
    {
      question: "What is your name?",
      answer: "My name is Ploy.",
      listen:
        "Whether your child can answer in a full sentence, and whether their own name comes out clearly. This is always the first question, because it shows whether a child is willing to speak at all.",
      mistake:
        "Most children answer with their nickname alone. That is not wrong, but it wastes the chance to show they can produce an English sentence.",
      practise:
        "Have your child answer \"My name is ___\" two or three times a day. Vary your tone and rhythm when you ask, so they are not just memorising the sound of your voice.",
      image: IMAGES[0],
      alt: "A girl standing with her hand on her chest, introducing herself in a classroom",
    },
    {
      question: "How old are you?",
      answer: "I am six years old.",
      listen:
        "The number in English, and whether your child adds \"years old\" after it.",
      mistake:
        "Children hold up fingers instead of speaking, or say the bare number \"six\". Fingers alone mean the examiner hears no English at all.",
      practise:
        "At first let them speak and hold up fingers together, then lower the hand once the words come easily. Revise numbers 1–10 alongside it.",
      image: IMAGES[1],
      alt: "A girl holding up fingers to show her age",
    },
    {
      question: "What is your favourite colour?",
      answer: "My favourite colour is blue.",
      listen:
        "The colour name in English, and whether your child understands the word \"favourite\" — it comes back in several other questions.",
      mistake:
        "Children know their colours perfectly well but do not know the word \"favourite\", so they go silent on a question they could easily answer.",
      practise:
        "Teach \"favourite\" as \"the one you like best\", then use it across many topics — colours, food, animals, toys. Get them used to the question, not just the answer.",
      image: IMAGES[2],
      alt: "A girl kneeling and pointing at coloured crayons on a table",
    },
    {
      question: "Do you have any brothers or sisters?",
      answer: "Yes, I have one brother. / No, I don't.",
      listen:
        "\"Yes\" or \"No\" first, then the number and the word brother or sister. This question tests whether a child recognises a yes/no question.",
      mistake:
        "Answering straight with a number — \"One\" — which sounds like they did not understand the question, even when they did.",
      practise:
        "Practise lots of \"Do you...?\" questions, always answering Yes or No first and adding the detail after. Practise both having and not having siblings.",
      image: IMAGES[3],
      alt: "A girl standing with her arm around her younger brother",
    },
    {
      question: "What do you like to do?",
      answer: "I like to draw.",
      listen:
        "The verb after \"I like to\". This is the most open question of the five, and the one examiners use to see whether a child can keep going on their own.",
      mistake:
        "Answering with a single noun — \"Football\" — instead of \"I like to play football\", which sounds memorised rather than understood.",
      practise:
        "Pick three things your child genuinely enjoys and practise all three as full sentences. Answers drawn from real life come out far more naturally than rehearsed ones.",
      image: IMAGES[4],
      alt: "A girl sitting at a table drawing and colouring",
    },
  ] as QuestionCard[],

  adviceH2: "What to know before interview day",
  adviceIntro:
    "Examiners are not looking for a child who says every word correctly. They are looking for a child who understands the question and is willing to answer.",
  adviceItems: [
    {
      emoji: "🗣️",
      title: "A sentence beats a single word",
      body: "One word is not wrong, but a full sentence shows your child can use the language, not just recall vocabulary.",
    },
    {
      emoji: "👂",
      title: "Practise listening, not reciting",
      body: "A child who has memorised answers stalls the moment the examiner rephrases the question. Shuffle the order and change your wording when you practise.",
    },
    {
      emoji: "🙂",
      title: "Eye contact and a smile genuinely count",
      body: "Examiners score confidence too. A child who looks up and smiles reads as more capable than one who answers correctly at the floor.",
    },
    {
      emoji: "⏱️",
      title: "Five minutes a day beats cramming",
      body: "Short daily practice works better than one heavy session before the exam, and it does not stress the child.",
    },
    {
      emoji: "🤫",
      title: "Do not translate mid-practice",
      body: "If your child does not understand, ask again more slowly or use gestures. Translating straight into Thai teaches them to wait for the translation instead of listening to the English.",
    },
  ],

  printableH2: "Get the 20-question practice worksheet to print at home",
  printableBody:
    "A 2-page A4 PDF with the five questions above plus fifteen more, a writing line for each answer, and tick boxes for each practice session. Designed to print in black and white at home — no expensive colour ink.",
  printablePlaceholder: "Your email",
  printableCta: "Send me the worksheet",
  printableSending: "Sending...",
  printableSuccess:
    "Sent! Please check your email — look in your spam folder if it is not there.",
  printableError: "That did not send. Please try again.",
  printableBusy: "We are handling a lot of requests right now. Please try again later.",
  printableInvalid: "Please enter a valid email address.",
  printablePrivacy:
    "We use your address to send the worksheet. You can unsubscribe any time from the link in the email.",

  offerH2: "If you want your child practising every day",
  offerBody:
    "English Allstars is an English app for Thai children aged 4–8 preparing for English-language school entrance exams. It was built by an American English professor living in Thailand, whose own children face the same exam as yours.",
  offerItems: [
    {
      emoji: "📚",
      title: "Illustrated flashcards",
      desc: "One word at a time, voiced by a native English speaker",
      screenshot: "/screenshot-flashcard.webp",
    },
    {
      emoji: "✅",
      title: "Quizzes",
      desc: "A different set of questions each time, with a trophy at the end",
      screenshot: "/screenshot-quiz.webp",
    },
    {
      emoji: "📖",
      title: "Every topic covered",
      desc: "Vocabulary, read-along storybooks, quizzes and mock entrance tests",
      screenshot: "/screenshot-subjects.webp",
    },
  ],
  offerCta: "Start your free 7-day trial",

  trialHeadline: "No charge during the first 7 days.",
  trialTerms:
    "A credit or debit card is required to start. Free for 7 days, then 750 THB/month automatically. Cancel any time before day 7 at no charge.",
  contactPrompt: "Questions?",
  contactLink: "info@englishallstars.com",
};
