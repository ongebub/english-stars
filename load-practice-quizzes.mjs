/**
 * load-practice-quizzes.mjs
 * Generates and inserts 16 practice quizzes (4 sections x 4 grade bands)
 * into the assessment_* tables.
 *
 * Run: node load-practice-quizzes.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env
const envPath = resolve(".", ".env.local");
const envText = readFileSync(envPath, "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Assessment IDs (from the insert above) ───────────────
const ASSESSMENT_IDS = {
  expression_K: "b3806fdf-c248-43fd-ab4c-408a7212023d",
  expression_1: "d60a2dd3-7cd5-44b7-bf28-3d0cd4157347",
  expression_2: "21d5b4a7-c359-42de-9eb2-08eba08feb32",
  expression_3: "37a92bc7-8ca7-4641-8f08-d1830b2b58df",
  reading_K: "5179d9e2-5d02-4ea6-b145-0bdc4e391224",
  reading_1: "1dc4db53-e426-4a15-8d7e-6e454b034264",
  reading_2: "c43db82a-34b9-46fb-abc8-09f45b775d27",
  reading_3: "5044e325-ac4b-4e9c-a864-4c7cb57b3bd5",
  structure_K: "4bb90b8c-c6af-45f7-8f9e-d2515ae29308",
  structure_1: "9af6a661-cab6-464e-8e6b-5de7af9ef6d7",
  structure_2: "4e894a0e-2b28-4f9e-8154-7ffd5ff84c7f",
  structure_3: "050ac819-a012-4883-8647-8a909260daf4",
  vocabulary_K: "11fe0251-4b28-4722-8eee-fe191ac99687",
  vocabulary_1: "deb587e5-c7a8-4976-b98f-e3644d27e91d",
  vocabulary_2: "31162b33-7f45-418a-aa10-63bf79af0ce4",
  vocabulary_3: "49c36480-9902-4a3f-8d05-fac1d56dd310",
};

// ─── Shuffle helper: randomize which option_number gets is_correct ───
function shuffleCorrectOption(options) {
  // options = [{text, isCorrect},...] - always 5 items, first is correct
  // Shuffle all options randomly, then assign option_number 1-5
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((o, idx) => ({
    option_number: idx + 1,
    text_en: o.text,
    is_correct: o.isCorrect,
  }));
}

// ─── EXPRESSION QUIZZES ─────────────────────────────────
// Expression: situation-based dialogue completion

const EXPRESSION_K = [
  { situation: "At school in the morning", dialogue: "Teacher Julie: Good morning!\nNong Fah: _____(1)_____", prompt: "What should Nong Fah say?", options: [{ text: "Good morning, teacher!", isCorrect: true }, { text: "Goodnight, teacher!", isCorrect: false }, { text: "Goodbye, teacher!", isCorrect: false }, { text: "I am sorry, teacher!", isCorrect: false }, { text: "Thank you, teacher!", isCorrect: false }] },
  { situation: "Meeting a friend", dialogue: "Ollie: Hello, Nong Fah!\nNong Fah: _____", prompt: "What should Nong Fah say?", options: [{ text: "Hello, Ollie!", isCorrect: true }, { text: "Goodnight, Ollie!", isCorrect: false }, { text: "I am sorry, Ollie!", isCorrect: false }, { text: "You are welcome!", isCorrect: false }, { text: "Goodbye, Ollie!", isCorrect: false }] },
  { situation: "At bedtime", dialogue: "Mom: Time for bed!\nThawan: _____", prompt: "What should Thawan say?", options: [{ text: "Goodnight, Mom!", isCorrect: true }, { text: "Good morning, Mom!", isCorrect: false }, { text: "Good afternoon, Mom!", isCorrect: false }, { text: "Excuse me, Mom!", isCorrect: false }, { text: "How are you, Mom?", isCorrect: false }] },
  { situation: "Receiving a gift", dialogue: "Emily: Here is a present for you.\nNong Fah: _____", prompt: "What should Nong Fah say?", options: [{ text: "Thank you!", isCorrect: true }, { text: "Goodbye!", isCorrect: false }, { text: "I am sorry!", isCorrect: false }, { text: "Good morning!", isCorrect: false }, { text: "Excuse me!", isCorrect: false }] },
  { situation: "Asking someone's name", dialogue: "Thawan: Hello! _____ ?\nEmily: My name is Emily.", prompt: "What should Thawan ask?", options: [{ text: "What is your name?", isCorrect: true }, { text: "How old are you?", isCorrect: false }, { text: "Where do you live?", isCorrect: false }, { text: "How are you?", isCorrect: false }, { text: "What is this?", isCorrect: false }] },
  { situation: "Someone helps you", dialogue: "Ollie helps Nong Fah carry her bag.\nNong Fah: _____\nOllie: You are welcome!", prompt: "What should Nong Fah say?", options: [{ text: "Thank you, Ollie!", isCorrect: true }, { text: "Goodbye, Ollie!", isCorrect: false }, { text: "Hello, Ollie!", isCorrect: false }, { text: "I am sorry, Ollie!", isCorrect: false }, { text: "Goodnight, Ollie!", isCorrect: false }] },
  { situation: "Leaving school", dialogue: "Teacher Julie: Goodbye, class!\nChildren: _____", prompt: "What should the children say?", options: [{ text: "Goodbye, teacher!", isCorrect: true }, { text: "Good morning, teacher!", isCorrect: false }, { text: "Excuse me, teacher!", isCorrect: false }, { text: "I am sorry, teacher!", isCorrect: false }, { text: "How are you, teacher?", isCorrect: false }] },
  { situation: "Asking how someone feels", dialogue: "Teacher Julie: How are you today?\nThawan: _____", prompt: "What should Thawan say?", options: [{ text: "I am fine, thank you.", isCorrect: true }, { text: "My name is Thawan.", isCorrect: false }, { text: "I am seven years old.", isCorrect: false }, { text: "Goodbye, teacher.", isCorrect: false }, { text: "You are welcome.", isCorrect: false }] },
  { situation: "Saying sorry", dialogue: "Thawan steps on Nong Fah's foot.\nThawan: _____\nNong Fah: That is all right.", prompt: "What should Thawan say?", options: [{ text: "I am sorry!", isCorrect: true }, { text: "Thank you!", isCorrect: false }, { text: "Hello!", isCorrect: false }, { text: "Goodbye!", isCorrect: false }, { text: "Good morning!", isCorrect: false }] },
  { situation: "In the afternoon", dialogue: "Nong Fah sees her neighbor after lunch.\nNong Fah: _____", prompt: "What should Nong Fah say?", options: [{ text: "Good afternoon!", isCorrect: true }, { text: "Good morning!", isCorrect: false }, { text: "Goodnight!", isCorrect: false }, { text: "I am sorry!", isCorrect: false }, { text: "You are welcome!", isCorrect: false }] },
  { situation: "Meeting someone new", dialogue: "Emily: My name is Emily. Nice to meet you!\nNong Fah: _____", prompt: "What should Nong Fah say?", options: [{ text: "Nice to meet you too!", isCorrect: true }, { text: "I am sorry!", isCorrect: false }, { text: "Goodnight!", isCorrect: false }, { text: "You are welcome!", isCorrect: false }, { text: "Excuse me!", isCorrect: false }] },
  { situation: "Asking to play", dialogue: "Thawan: Can I play with you?\nOllie: _____", prompt: "What should Ollie say?", options: [{ text: "Yes, of course!", isCorrect: true }, { text: "Good morning!", isCorrect: false }, { text: "I am sorry!", isCorrect: false }, { text: "Goodnight!", isCorrect: false }, { text: "What is your name?", isCorrect: false }] },
  { situation: "At a party", dialogue: "Mom: Would you like some cake?\nBua: _____", prompt: "What should Bua say?", options: [{ text: "Yes, please!", isCorrect: true }, { text: "Goodnight!", isCorrect: false }, { text: "I am sorry!", isCorrect: false }, { text: "Goodbye!", isCorrect: false }, { text: "How are you?", isCorrect: false }] },
  { situation: "Bumping into someone", dialogue: "Nong Fah bumps into a lady at the market.\nNong Fah: _____", prompt: "What should Nong Fah say?", options: [{ text: "Excuse me! I am sorry.", isCorrect: true }, { text: "Good morning!", isCorrect: false }, { text: "Thank you!", isCorrect: false }, { text: "Goodbye!", isCorrect: false }, { text: "How are you?", isCorrect: false }] },
  { situation: "Wishing someone well", dialogue: "Thawan is going home.\nTeacher Julie: _____ Thawan!", prompt: "What should Teacher Julie say?", options: [{ text: "Have a good day,", isCorrect: true }, { text: "I am sorry,", isCorrect: false }, { text: "Good morning,", isCorrect: false }, { text: "How are you,", isCorrect: false }, { text: "What is your name,", isCorrect: false }] },
];

const EXPRESSION_1 = [
  { situation: "At the doctor", dialogue: "Doctor: How do you feel today?\nThawan: _____(1)_____", prompt: "What should Thawan say?", options: [{ text: "I do not feel well.", isCorrect: true }, { text: "Nice to meet you.", isCorrect: false }, { text: "I am nine years old.", isCorrect: false }, { text: "You are welcome.", isCorrect: false }, { text: "Goodnight.", isCorrect: false }] },
  { situation: "At the doctor", dialogue: "Doctor: Here is some medicine.\nThawan: _____", prompt: "What should Thawan say?", options: [{ text: "Thank you, doctor.", isCorrect: true }, { text: "Good morning, doctor.", isCorrect: false }, { text: "Goodbye, doctor.", isCorrect: false }, { text: "Excuse me, doctor.", isCorrect: false }, { text: "I am sorry, doctor.", isCorrect: false }] },
  { situation: "At the market", dialogue: "Nong Fah: _____ apples do you have?\nSeller: I have ten apples.", prompt: "What should Nong Fah ask?", options: [{ text: "How many", isCorrect: true }, { text: "How much", isCorrect: false }, { text: "How old", isCorrect: false }, { text: "What time", isCorrect: false }, { text: "Where", isCorrect: false }] },
  { situation: "Buying fruit", dialogue: "Nong Fah: I would like two apples, _____.\nSeller: Here you are.", prompt: "What should Nong Fah say?", options: [{ text: "please", isCorrect: true }, { text: "sorry", isCorrect: false }, { text: "hello", isCorrect: false }, { text: "goodbye", isCorrect: false }, { text: "goodnight", isCorrect: false }] },
  { situation: "On the telephone", dialogue: "Nong Fah: Hello, Thawan. _____?\nThawan: I am playing football.", prompt: "What should Nong Fah ask?", options: [{ text: "What are you doing?", isCorrect: true }, { text: "Who are you?", isCorrect: false }, { text: "Where are you from?", isCorrect: false }, { text: "How old are you?", isCorrect: false }, { text: "What is your name?", isCorrect: false }] },
  { situation: "Inviting a friend", dialogue: "Nong Fah: Can I play too?\nThawan: _____ Come to the park!", prompt: "What should Thawan say?", options: [{ text: "Yes, of course!", isCorrect: true }, { text: "No, thank you.", isCorrect: false }, { text: "I am sorry.", isCorrect: false }, { text: "Goodnight.", isCorrect: false }, { text: "Excuse me.", isCorrect: false }] },
  { situation: "Asking for directions", dialogue: "Emily: _____ Where is the library?\nNong Fah: It is next to the school.", prompt: "What should Emily say first?", options: [{ text: "Excuse me.", isCorrect: true }, { text: "Goodnight.", isCorrect: false }, { text: "You are welcome.", isCorrect: false }, { text: "Have a good day.", isCorrect: false }, { text: "I am sorry.", isCorrect: false }] },
  { situation: "Getting help", dialogue: "Nong Fah shows Emily the way.\nEmily: _____", prompt: "What should Emily say?", options: [{ text: "Thank you very much.", isCorrect: true }, { text: "Good morning.", isCorrect: false }, { text: "How old are you?", isCorrect: false }, { text: "Goodnight.", isCorrect: false }, { text: "Nice to meet you.", isCorrect: false }] },
  { situation: "At a friend's house", dialogue: "Nong Fah: Would you like some juice?\nThawan: _____", prompt: "What should Thawan say?", options: [{ text: "Yes, please.", isCorrect: true }, { text: "Goodnight.", isCorrect: false }, { text: "I am sorry.", isCorrect: false }, { text: "Excuse me.", isCorrect: false }, { text: "Nice to meet you.", isCorrect: false }] },
  { situation: "Leaving school", dialogue: "Teacher Julie: Goodbye, class. _____!\nChildren: Thank you, teacher!", prompt: "What should Teacher Julie say?", options: [{ text: "Have a good day", isCorrect: true }, { text: "Good morning", isCorrect: false }, { text: "Nice to meet you", isCorrect: false }, { text: "How are you", isCorrect: false }, { text: "I am sorry", isCorrect: false }] },
  { situation: "At the shop", dialogue: "Thawan: _____ is this pencil?\nShopkeeper: It is ten baht.", prompt: "What should Thawan ask?", options: [{ text: "How much", isCorrect: true }, { text: "How many", isCorrect: false }, { text: "How old", isCorrect: false }, { text: "How far", isCorrect: false }, { text: "How tall", isCorrect: false }] },
  { situation: "After lunch", dialogue: "Nong Fah finished eating.\nNong Fah: _____ leave the table?\nMom: Yes, you may.", prompt: "What should Nong Fah say?", options: [{ text: "May I", isCorrect: true }, { text: "Must I", isCorrect: false }, { text: "Did I", isCorrect: false }, { text: "Was I", isCorrect: false }, { text: "Am I", isCorrect: false }] },
  { situation: "Asking about age", dialogue: "Emily: _____ are you, Thawan?\nThawan: I am seven years old.", prompt: "What should Emily ask?", options: [{ text: "How old", isCorrect: true }, { text: "How many", isCorrect: false }, { text: "How much", isCorrect: false }, { text: "How far", isCorrect: false }, { text: "How long", isCorrect: false }] },
  { situation: "In the classroom", dialogue: "Thawan: _____, Teacher Julie. May I go to the bathroom?\nTeacher Julie: Yes, you may.", prompt: "What should Thawan say?", options: [{ text: "Excuse me", isCorrect: true }, { text: "Thank you", isCorrect: false }, { text: "Goodnight", isCorrect: false }, { text: "You are welcome", isCorrect: false }, { text: "Goodbye", isCorrect: false }] },
  { situation: "Being thanked", dialogue: "Ollie: Thank you for the cookie!\nNong Fah: _____", prompt: "What should Nong Fah say?", options: [{ text: "You are welcome!", isCorrect: true }, { text: "I am sorry!", isCorrect: false }, { text: "Excuse me!", isCorrect: false }, { text: "Goodbye!", isCorrect: false }, { text: "How are you?", isCorrect: false }] },
];

const EXPRESSION_2 = [
  { situation: "At the post office", dialogue: "Thawan: _____ send this letter to Bangkok?\nClerk: Yes, it will cost twenty baht.", prompt: "What should Thawan ask?", options: [{ text: "Could you please", isCorrect: true }, { text: "What did you", isCorrect: false }, { text: "Who can", isCorrect: false }, { text: "When did you", isCorrect: false }, { text: "Why do you", isCorrect: false }] },
  { situation: "At a restaurant", dialogue: "Waiter: What would you like to order?\nNong Fah: _____\nWaiter: Anything to drink?", prompt: "What should Nong Fah say?", options: [{ text: "I would like fried rice, please.", isCorrect: true }, { text: "I am seven years old.", isCorrect: false }, { text: "Nice to meet you.", isCorrect: false }, { text: "How are you?", isCorrect: false }, { text: "My name is Nong Fah.", isCorrect: false }] },
  { situation: "Suggesting an activity", dialogue: "Thawan: I am bored.\nOllie: _____ go to the park?\nThawan: That is a great idea!", prompt: "What should Ollie say?", options: [{ text: "Why don't we", isCorrect: true }, { text: "Where did we", isCorrect: false }, { text: "When did we", isCorrect: false }, { text: "Who can we", isCorrect: false }, { text: "What time do we", isCorrect: false }] },
  { situation: "Declining politely", dialogue: "Emily: Would you like more cake?\nThawan: _____ I am full.", prompt: "What should Thawan say?", options: [{ text: "No, thank you.", isCorrect: true }, { text: "I am sorry.", isCorrect: false }, { text: "You are welcome.", isCorrect: false }, { text: "Excuse me.", isCorrect: false }, { text: "Good morning.", isCorrect: false }] },
  { situation: "Giving a compliment", dialogue: "Nong Fah draws a picture of a rainbow.\nThawan: _____\nNong Fah: Thank you!", prompt: "What should Thawan say?", options: [{ text: "That is a beautiful picture!", isCorrect: true }, { text: "I am sorry.", isCorrect: false }, { text: "Goodbye.", isCorrect: false }, { text: "What is your name?", isCorrect: false }, { text: "Goodnight.", isCorrect: false }] },
  { situation: "Making a request", dialogue: "Thawan: _____ pass the salt?\nMom: Here you are.\nThawan: Thank you, Mom.", prompt: "What should Thawan say?", options: [{ text: "Could you please", isCorrect: true }, { text: "Why do you", isCorrect: false }, { text: "Who can", isCorrect: false }, { text: "When did you", isCorrect: false }, { text: "Where do you", isCorrect: false }] },
  { situation: "Checking the weather", dialogue: "Nong Fah: _____ the weather like today?\nMom: It is sunny and warm.", prompt: "What should Nong Fah ask?", options: [{ text: "What is", isCorrect: true }, { text: "Who is", isCorrect: false }, { text: "Where is", isCorrect: false }, { text: "When is", isCorrect: false }, { text: "Why is", isCorrect: false }] },
  { situation: "Asking about location", dialogue: "Emily: _____ is the hospital?\nNong Fah: It is behind the temple.", prompt: "What should Emily ask?", options: [{ text: "Where", isCorrect: true }, { text: "When", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "What", isCorrect: false }, { text: "Why", isCorrect: false }] },
  { situation: "Apologizing for being late", dialogue: "Thawan arrives late to class.\nThawan: _____, Teacher Julie. I am late.\nTeacher Julie: Please sit down.", prompt: "What should Thawan say?", options: [{ text: "I am sorry", isCorrect: true }, { text: "Thank you", isCorrect: false }, { text: "You are welcome", isCorrect: false }, { text: "Hello", isCorrect: false }, { text: "Goodnight", isCorrect: false }] },
  { situation: "Asking about someone's weekend", dialogue: "Emily: _____ did you do last weekend?\nThawan: I went swimming.", prompt: "What should Emily ask?", options: [{ text: "What", isCorrect: true }, { text: "Where", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "When", isCorrect: false }, { text: "How much", isCorrect: false }] },
  { situation: "Offering help", dialogue: "Bua is carrying many books.\nNong Fah: _____ carry some books for you?\nBua: Yes, please. Thank you!", prompt: "What should Nong Fah say?", options: [{ text: "Can I help you", isCorrect: true }, { text: "What is your name", isCorrect: false }, { text: "How old are you", isCorrect: false }, { text: "Goodnight", isCorrect: false }, { text: "Where are you from", isCorrect: false }] },
  { situation: "Asking about time", dialogue: "Thawan: _____ is it?\nNong Fah: It is three o'clock.", prompt: "What should Thawan ask?", options: [{ text: "What time", isCorrect: true }, { text: "How many", isCorrect: false }, { text: "How old", isCorrect: false }, { text: "How far", isCorrect: false }, { text: "How much", isCorrect: false }] },
  { situation: "Congratulating someone", dialogue: "Nong Fah wins the spelling contest.\nTeacher Julie: _____!\nNong Fah: Thank you, teacher!", prompt: "What should Teacher Julie say?", options: [{ text: "Congratulations", isCorrect: true }, { text: "I am sorry", isCorrect: false }, { text: "Excuse me", isCorrect: false }, { text: "Goodbye", isCorrect: false }, { text: "Goodnight", isCorrect: false }] },
  { situation: "Asking for permission", dialogue: "Thawan: _____ borrow your eraser?\nEmily: Yes, here you are.", prompt: "What should Thawan say?", options: [{ text: "May I", isCorrect: true }, { text: "Must I", isCorrect: false }, { text: "Did I", isCorrect: false }, { text: "Will I", isCorrect: false }, { text: "Am I", isCorrect: false }] },
  { situation: "Greeting in the evening", dialogue: "Dad comes home from work.\nThawan: _____!\nDad: Hello, Thawan! How was school?", prompt: "What should Thawan say?", options: [{ text: "Good evening, Dad", isCorrect: true }, { text: "Good morning, Dad", isCorrect: false }, { text: "Goodnight, Dad", isCorrect: false }, { text: "Goodbye, Dad", isCorrect: false }, { text: "I am sorry, Dad", isCorrect: false }] },
];

const EXPRESSION_3 = [
  { situation: "Making plans", dialogue: "Thawan: What _____ you like to do after school?\nNong Fah: I would like to go to the library.\nThawan: _____ a great idea!", prompt: "Choose the best words for both blanks.", options: [{ text: "would / That is", isCorrect: true }, { text: "did / That was", isCorrect: false }, { text: "are / This was", isCorrect: false }, { text: "do / It was", isCorrect: false }, { text: "can / Those are", isCorrect: false }] },
  { situation: "At a birthday party", dialogue: "Nong Fah: _____ birthday, Bua!\nBua: Thank you for coming to my party!\nNong Fah: Here is a _____ for you.", prompt: "Choose the best words for both blanks.", options: [{ text: "Happy / present", isCorrect: true }, { text: "Good / morning", isCorrect: false }, { text: "Merry / cake", isCorrect: false }, { text: "Nice / book", isCorrect: false }, { text: "Great / letter", isCorrect: false }] },
  { situation: "Asking for an opinion", dialogue: "Thawan: _____ do you think of this book?\nEmily: I think it is very interesting!", prompt: "What should Thawan ask?", options: [{ text: "What", isCorrect: true }, { text: "Where", isCorrect: false }, { text: "When", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "How many", isCorrect: false }] },
  { situation: "Expressing surprise", dialogue: "Teacher Julie: You got a perfect score!\nThawan: _____! I studied very hard.", prompt: "What should Thawan say?", options: [{ text: "Really? That is wonderful", isCorrect: true }, { text: "I am sorry", isCorrect: false }, { text: "Goodnight, teacher", isCorrect: false }, { text: "Excuse me", isCorrect: false }, { text: "You are welcome", isCorrect: false }] },
  { situation: "Comparing hobbies", dialogue: "Emily: Which do you _____ better, swimming or running?\nThawan: I _____ swimming because I love the water.", prompt: "Choose the best words for both blanks.", options: [{ text: "like / prefer", isCorrect: true }, { text: "do / want", isCorrect: false }, { text: "play / need", isCorrect: false }, { text: "have / get", isCorrect: false }, { text: "go / see", isCorrect: false }] },
  { situation: "Describing a problem", dialogue: "Thawan: I cannot find my homework. _____ you help me look for it?\nTeacher Julie: Of course. Where did you last see it?", prompt: "What should Thawan ask?", options: [{ text: "Could", isCorrect: true }, { text: "Must", isCorrect: false }, { text: "Did", isCorrect: false }, { text: "Was", isCorrect: false }, { text: "Am", isCorrect: false }] },
  { situation: "Planning a trip", dialogue: "Mom: _____ would you like to go this holiday?\nNong Fah: I would like to go to the beach.\nMom: That sounds fun!", prompt: "What should Mom ask?", options: [{ text: "Where", isCorrect: true }, { text: "When", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "How much", isCorrect: false }, { text: "How many", isCorrect: false }] },
  { situation: "Giving advice", dialogue: "Nong Fah has a cold.\nOllie: You _____ rest and drink warm water.\nNong Fah: Thank you, Ollie. That is good advice.", prompt: "What should Ollie say?", options: [{ text: "should", isCorrect: true }, { text: "must not", isCorrect: false }, { text: "cannot", isCorrect: false }, { text: "did not", isCorrect: false }, { text: "will not", isCorrect: false }] },
  { situation: "Reporting what happened", dialogue: "Teacher Julie: _____ happened in the playground?\nThawan: Bua fell down, but she is all right now.", prompt: "What should Teacher Julie ask?", options: [{ text: "What", isCorrect: true }, { text: "Where", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "How much", isCorrect: false }, { text: "How many", isCorrect: false }] },
  { situation: "Expressing preference", dialogue: "Waiter: Would you like rice or noodles?\nThawan: I _____ rather have rice, please.", prompt: "What should Thawan say?", options: [{ text: "would", isCorrect: true }, { text: "must", isCorrect: false }, { text: "can", isCorrect: false }, { text: "did", isCorrect: false }, { text: "am", isCorrect: false }] },
  { situation: "Agreeing with someone", dialogue: "Emily: I think rainy days are nice for reading.\nNong Fah: I _____ with you. Reading is fun on rainy days.", prompt: "What should Nong Fah say?", options: [{ text: "agree", isCorrect: true }, { text: "sorry", isCorrect: false }, { text: "welcome", isCorrect: false }, { text: "morning", isCorrect: false }, { text: "excuse", isCorrect: false }] },
  { situation: "Asking about frequency", dialogue: "Teacher Julie: _____ often do you read books?\nNong Fah: I read every day.", prompt: "What should Teacher Julie ask?", options: [{ text: "How", isCorrect: true }, { text: "What", isCorrect: false }, { text: "Where", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "Which", isCorrect: false }] },
  { situation: "Explaining a reason", dialogue: "Mom: Why are you late?\nThawan: _____ the bus was late today.\nMom: I see. Please call next time.", prompt: "What should Thawan say?", options: [{ text: "Because", isCorrect: true }, { text: "Although", isCorrect: false }, { text: "Before", isCorrect: false }, { text: "Until", isCorrect: false }, { text: "Unless", isCorrect: false }] },
  { situation: "Making an invitation", dialogue: "Nong Fah: _____ you like to come to my house after school?\nEmily: Yes, I would love to!", prompt: "What should Nong Fah ask?", options: [{ text: "Would", isCorrect: true }, { text: "Did", isCorrect: false }, { text: "Were", isCorrect: false }, { text: "Must", isCorrect: false }, { text: "Was", isCorrect: false }] },
  { situation: "Expressing gratitude", dialogue: "Thawan wins a prize.\nThawan: I _____ like to thank my teacher and my family.\nEveryone claps.", prompt: "What should Thawan say?", options: [{ text: "would", isCorrect: true }, { text: "did", isCorrect: false }, { text: "was", isCorrect: false }, { text: "must", isCorrect: false }, { text: "can", isCorrect: false }] },
];

// ─── READING QUIZZES ─────────────────────────────────────
// Each reading quiz has 3 passages with 5 questions each = 15 questions

// Reading K: simple passages, no inference
const READING_K_PASSAGES = [
  { title: "Ollie's Colors", body: "Ollie is a small owl. He has brown feathers. His eyes are big and yellow. Today Ollie sees a red apple on a tree. He sees a blue bird in the sky. He sees green grass on the ground.\n\n\"I love colors!\" says Ollie." },
  { title: "Nong Fah's Breakfast", body: "Nong Fah wakes up. She is hungry. Mom makes rice and eggs. Nong Fah drinks orange juice.\n\n\"Thank you, Mom!\" says Nong Fah.\n\"You are welcome,\" says Mom.\n\nNong Fah eats all her food. Now she is happy and ready for school." },
  { title: "At the Zoo", body: "Thawan goes to the zoo. He sees a big elephant. The elephant is gray. He sees a tall giraffe. The giraffe eats leaves from a tree.\n\nThawan sees a monkey. The monkey jumps and plays. Thawan laughs.\n\n\"The zoo is fun!\" says Thawan." },
];

const READING_K_QUESTIONS = [
  // Passage 1 questions
  [
    { prompt: "What animal is Ollie?", options: [{ text: "An owl", isCorrect: true }, { text: "A cat", isCorrect: false }, { text: "A dog", isCorrect: false }, { text: "A fish", isCorrect: false }, { text: "A frog", isCorrect: false }], isInference: false },
    { prompt: "What color are Ollie's eyes?", options: [{ text: "Yellow", isCorrect: true }, { text: "Blue", isCorrect: false }, { text: "Green", isCorrect: false }, { text: "Red", isCorrect: false }, { text: "Brown", isCorrect: false }], isInference: false },
    { prompt: "What color is the apple?", options: [{ text: "Red", isCorrect: true }, { text: "Blue", isCorrect: false }, { text: "Green", isCorrect: false }, { text: "Yellow", isCorrect: false }, { text: "Brown", isCorrect: false }], isInference: false },
    { prompt: "Where is the bird?", options: [{ text: "In the sky", isCorrect: true }, { text: "On the ground", isCorrect: false }, { text: "In the tree", isCorrect: false }, { text: "In the water", isCorrect: false }, { text: "On the table", isCorrect: false }], isInference: false },
    { prompt: "What color is the grass?", options: [{ text: "Green", isCorrect: true }, { text: "Red", isCorrect: false }, { text: "Blue", isCorrect: false }, { text: "Yellow", isCorrect: false }, { text: "Brown", isCorrect: false }], isInference: false },
  ],
  // Passage 2 questions
  [
    { prompt: "Who makes breakfast?", options: [{ text: "Mom", isCorrect: true }, { text: "Dad", isCorrect: false }, { text: "Thawan", isCorrect: false }, { text: "Ollie", isCorrect: false }, { text: "Teacher Julie", isCorrect: false }], isInference: false },
    { prompt: "What does Nong Fah drink?", options: [{ text: "Orange juice", isCorrect: true }, { text: "Milk", isCorrect: false }, { text: "Water", isCorrect: false }, { text: "Tea", isCorrect: false }, { text: "Soup", isCorrect: false }], isInference: false },
    { prompt: "What does Nong Fah eat?", options: [{ text: "Rice and eggs", isCorrect: true }, { text: "Bread and jam", isCorrect: false }, { text: "Cereal", isCorrect: false }, { text: "Noodles", isCorrect: false }, { text: "Fruit", isCorrect: false }], isInference: false },
    { prompt: "What does Nong Fah say to Mom?", options: [{ text: "Thank you, Mom!", isCorrect: true }, { text: "Goodbye, Mom!", isCorrect: false }, { text: "I am sorry, Mom!", isCorrect: false }, { text: "Goodnight, Mom!", isCorrect: false }, { text: "Excuse me, Mom!", isCorrect: false }], isInference: false },
    { prompt: "Where is Nong Fah going?", options: [{ text: "To school", isCorrect: true }, { text: "To the park", isCorrect: false }, { text: "To the zoo", isCorrect: false }, { text: "To the shop", isCorrect: false }, { text: "To bed", isCorrect: false }], isInference: false },
  ],
  // Passage 3 questions
  [
    { prompt: "Where does Thawan go?", options: [{ text: "To the zoo", isCorrect: true }, { text: "To school", isCorrect: false }, { text: "To the park", isCorrect: false }, { text: "To the market", isCorrect: false }, { text: "To the beach", isCorrect: false }], isInference: false },
    { prompt: "What color is the elephant?", options: [{ text: "Gray", isCorrect: true }, { text: "Brown", isCorrect: false }, { text: "White", isCorrect: false }, { text: "Black", isCorrect: false }, { text: "Blue", isCorrect: false }], isInference: false },
    { prompt: "What does the giraffe eat?", options: [{ text: "Leaves", isCorrect: true }, { text: "Fish", isCorrect: false }, { text: "Rice", isCorrect: false }, { text: "Apples", isCorrect: false }, { text: "Bread", isCorrect: false }], isInference: false },
    { prompt: "What does the monkey do?", options: [{ text: "Jumps and plays", isCorrect: true }, { text: "Sleeps", isCorrect: false }, { text: "Swims", isCorrect: false }, { text: "Eats leaves", isCorrect: false }, { text: "Flies", isCorrect: false }], isInference: false },
    { prompt: "How does Thawan feel at the zoo?", options: [{ text: "He thinks it is fun", isCorrect: true }, { text: "He is sad", isCorrect: false }, { text: "He is scared", isCorrect: false }, { text: "He is tired", isCorrect: false }, { text: "He is angry", isCorrect: false }], isInference: false },
  ],
];

// Reading 1: slightly longer, 1 inference per passage
const READING_1_PASSAGES = [
  { title: "The Lost Ball", body: "Thawan and Ollie play with a red ball in the park. Thawan kicks the ball. It goes over the fence into the garden.\n\n\"Oh no!\" says Thawan. \"My ball is lost!\"\n\nOllie flies over the fence. He sees the ball under a bush. He pushes it back to Thawan.\n\n\"Thank you, Ollie! You are a good friend,\" says Thawan." },
  { title: "Rainy Day Fun", body: "It is a rainy day. Nong Fah cannot go outside. She looks out the window. The sky is gray and cloudy.\n\n\"I am bored,\" says Nong Fah.\n\nMom gives her paper and crayons. Nong Fah draws a big rainbow with all the colors. Red, orange, yellow, green, blue, and purple.\n\n\"Look, Mom! A rainbow!\" says Nong Fah.\nMom smiles. \"It is beautiful, Nong Fah!\"" },
  { title: "The Pet Fish", body: "Emily has a pet fish. The fish is orange and white. It lives in a round bowl on the table.\n\nEvery morning, Emily feeds the fish. She puts a little food in the water. The fish swims up and eats it.\n\n\"Good morning, Goldie!\" Emily says to her fish every day.\n\nOne day, Emily gets a bigger bowl for Goldie. Now Goldie has more room to swim." },
];

const READING_1_QUESTIONS = [
  [
    { prompt: "What color is the ball?", options: [{ text: "Red", isCorrect: true }, { text: "Blue", isCorrect: false }, { text: "Green", isCorrect: false }, { text: "Yellow", isCorrect: false }, { text: "White", isCorrect: false }], isInference: false },
    { prompt: "Where does the ball go?", options: [{ text: "Over the fence into the garden", isCorrect: true }, { text: "Into the pond", isCorrect: false }, { text: "Up in the tree", isCorrect: false }, { text: "Under the car", isCorrect: false }, { text: "On the roof", isCorrect: false }], isInference: false },
    { prompt: "How does Ollie get the ball?", options: [{ text: "He flies over the fence", isCorrect: true }, { text: "He digs under the fence", isCorrect: false }, { text: "He opens the gate", isCorrect: false }, { text: "He jumps over the fence", isCorrect: false }, { text: "He asks the neighbor", isCorrect: false }], isInference: false },
    { prompt: "Where is the ball in the garden?", options: [{ text: "Under a bush", isCorrect: true }, { text: "In a tree", isCorrect: false }, { text: "In the pond", isCorrect: false }, { text: "On the path", isCorrect: false }, { text: "Behind the door", isCorrect: false }], isInference: false },
    { prompt: "Why does Thawan call Ollie a good friend?", options: [{ text: "Because Ollie helped him get his ball back.", isCorrect: true }, { text: "Because Ollie gave him a new ball.", isCorrect: false }, { text: "Because Ollie played football with him.", isCorrect: false }, { text: "Because Ollie bought him a toy.", isCorrect: false }, { text: "Because Ollie made him lunch.", isCorrect: false }], isInference: true },
  ],
  [
    { prompt: "What is the weather like?", options: [{ text: "Rainy", isCorrect: true }, { text: "Sunny", isCorrect: false }, { text: "Snowy", isCorrect: false }, { text: "Windy", isCorrect: false }, { text: "Hot", isCorrect: false }], isInference: false },
    { prompt: "Why can Nong Fah not go outside?", options: [{ text: "It is raining", isCorrect: true }, { text: "She is sick", isCorrect: false }, { text: "She has homework", isCorrect: false }, { text: "It is bedtime", isCorrect: false }, { text: "She is eating", isCorrect: false }], isInference: false },
    { prompt: "What does Mom give Nong Fah?", options: [{ text: "Paper and crayons", isCorrect: true }, { text: "A book", isCorrect: false }, { text: "A toy", isCorrect: false }, { text: "A puzzle", isCorrect: false }, { text: "A ball", isCorrect: false }], isInference: false },
    { prompt: "What does Nong Fah draw?", options: [{ text: "A rainbow", isCorrect: true }, { text: "A flower", isCorrect: false }, { text: "A house", isCorrect: false }, { text: "A cat", isCorrect: false }, { text: "A tree", isCorrect: false }], isInference: false },
    { prompt: "How does Nong Fah feel after drawing?", options: [{ text: "She is no longer bored and feels happy.", isCorrect: true }, { text: "She is still bored.", isCorrect: false }, { text: "She is tired and sleepy.", isCorrect: false }, { text: "She is sad.", isCorrect: false }, { text: "She is hungry.", isCorrect: false }], isInference: true },
  ],
  [
    { prompt: "What color is the fish?", options: [{ text: "Orange and white", isCorrect: true }, { text: "Red and blue", isCorrect: false }, { text: "Green and yellow", isCorrect: false }, { text: "Black and white", isCorrect: false }, { text: "Blue and silver", isCorrect: false }], isInference: false },
    { prompt: "Where does the fish live?", options: [{ text: "In a round bowl on the table", isCorrect: true }, { text: "In a pond", isCorrect: false }, { text: "In the bathtub", isCorrect: false }, { text: "In a big tank", isCorrect: false }, { text: "In a river", isCorrect: false }], isInference: false },
    { prompt: "What is the fish's name?", options: [{ text: "Goldie", isCorrect: true }, { text: "Ollie", isCorrect: false }, { text: "Bubbles", isCorrect: false }, { text: "Sunny", isCorrect: false }, { text: "Fishy", isCorrect: false }], isInference: false },
    { prompt: "When does Emily feed the fish?", options: [{ text: "Every morning", isCorrect: true }, { text: "Every night", isCorrect: false }, { text: "Once a week", isCorrect: false }, { text: "After school", isCorrect: false }, { text: "At lunchtime", isCorrect: false }], isInference: false },
    { prompt: "Why does Emily get a bigger bowl?", options: [{ text: "So Goldie has more room to swim.", isCorrect: true }, { text: "Because the old bowl is broken.", isCorrect: false }, { text: "Because she got more fish.", isCorrect: false }, { text: "Because the old bowl is dirty.", isCorrect: false }, { text: "Because Mom told her to.", isCorrect: false }], isInference: true },
  ],
];

// Reading 2: longer passages, 2 inference per passage
const READING_2_PASSAGES = [
  { title: "The School Garden", body: "Teacher Julie's class started a garden at school. The children planted seeds in the soil. They planted tomatoes, sunflowers, and beans.\n\nEvery day, the children watered the plants and pulled out the weeds. After two weeks, small green leaves appeared above the soil.\n\n\"Look! The seeds are growing!\" said Nong Fah.\n\nAfter a month, the sunflowers were tall and yellow. The tomatoes turned red. The beans were long and green.\n\nThe class picked the vegetables and gave them to the school kitchen. The cook made a delicious salad for everyone." },
  { title: "Ollie's Adventure", body: "One morning, Ollie flew to the forest. He wanted to find new friends. First, he met a green frog by the pond.\n\n\"Hello! My name is Ollie. What is your name?\" asked Ollie.\n\"I am Freddy the Frog. I live in this pond,\" said the frog.\n\nThen Ollie flew to a tall tree. He met a red squirrel.\n\"Hello! I am Ollie. Do you want to play?\" asked Ollie.\n\"I am too busy collecting nuts for winter,\" said the squirrel.\n\nFinally, Ollie met a butterfly with blue wings. The butterfly did not talk, but it flew beside Ollie all the way home. Ollie was glad to have a quiet friend." },
  { title: "The Science Fair", body: "Thawan wanted to win the science fair. He decided to make a volcano. He used paper, paint, and baking soda.\n\nFirst, he made the volcano shape with paper. Then he painted it brown and red. Inside, he put baking soda.\n\nAt the science fair, Thawan poured vinegar into the volcano. Foam bubbled up and overflowed! Everyone clapped.\n\n\"How does it work?\" asked Nong Fah.\n\"The vinegar and baking soda mix together and make bubbles,\" explained Thawan.\n\nThawan did not win first place, but he won the creativity award. He was very proud." },
];

const READING_2_QUESTIONS = [
  [
    { prompt: "What did the class plant?", options: [{ text: "Tomatoes, sunflowers, and beans", isCorrect: true }, { text: "Roses and tulips", isCorrect: false }, { text: "Apples and oranges", isCorrect: false }, { text: "Rice and corn", isCorrect: false }, { text: "Carrots and peas", isCorrect: false }], isInference: false },
    { prompt: "How long until leaves appeared?", options: [{ text: "Two weeks", isCorrect: true }, { text: "One day", isCorrect: false }, { text: "Three months", isCorrect: false }, { text: "One year", isCorrect: false }, { text: "Five days", isCorrect: false }], isInference: false },
    { prompt: "What color did the tomatoes turn?", options: [{ text: "Red", isCorrect: true }, { text: "Green", isCorrect: false }, { text: "Yellow", isCorrect: false }, { text: "Orange", isCorrect: false }, { text: "Purple", isCorrect: false }], isInference: false },
    { prompt: "Why did the children pull weeds?", options: [{ text: "So the plants could grow well.", isCorrect: true }, { text: "Because the teacher was angry.", isCorrect: false }, { text: "Because they were bored.", isCorrect: false }, { text: "To make the garden look pretty.", isCorrect: false }, { text: "Because the weeds were flowers.", isCorrect: false }], isInference: true },
    { prompt: "What did the cook do with the vegetables?", options: [{ text: "Made a delicious salad for everyone.", isCorrect: true }, { text: "Threw them away.", isCorrect: false }, { text: "Sold them at the market.", isCorrect: false }, { text: "Gave them to the animals.", isCorrect: false }, { text: "Saved them for next week.", isCorrect: false }], isInference: false },
  ],
  [
    { prompt: "Where did Ollie go?", options: [{ text: "To the forest", isCorrect: true }, { text: "To the school", isCorrect: false }, { text: "To the city", isCorrect: false }, { text: "To the beach", isCorrect: false }, { text: "To the mountain", isCorrect: false }], isInference: false },
    { prompt: "Where does Freddy live?", options: [{ text: "In the pond", isCorrect: true }, { text: "In a tree", isCorrect: false }, { text: "In a cave", isCorrect: false }, { text: "On a hill", isCorrect: false }, { text: "In a house", isCorrect: false }], isInference: false },
    { prompt: "Why was the squirrel too busy to play?", options: [{ text: "It was collecting nuts for winter.", isCorrect: true }, { text: "It was sleeping.", isCorrect: false }, { text: "It was eating lunch.", isCorrect: false }, { text: "It was building a house.", isCorrect: false }, { text: "It was flying south.", isCorrect: false }], isInference: false },
    { prompt: "Why did Ollie call the butterfly a 'quiet friend'?", options: [{ text: "Because the butterfly did not talk.", isCorrect: true }, { text: "Because the butterfly was sleeping.", isCorrect: false }, { text: "Because the butterfly was shy.", isCorrect: false }, { text: "Because butterflies are small.", isCorrect: false }, { text: "Because Ollie does not like talking.", isCorrect: false }], isInference: true },
    { prompt: "What does this story teach about friendship?", options: [{ text: "Friends can be different from each other.", isCorrect: true }, { text: "You should only be friends with birds.", isCorrect: false }, { text: "Animals cannot be friends.", isCorrect: false }, { text: "You need many friends to be happy.", isCorrect: false }, { text: "Forests are dangerous places.", isCorrect: false }], isInference: true },
  ],
  [
    { prompt: "What did Thawan make for the science fair?", options: [{ text: "A volcano", isCorrect: true }, { text: "A robot", isCorrect: false }, { text: "A rocket", isCorrect: false }, { text: "A bridge", isCorrect: false }, { text: "A windmill", isCorrect: false }], isInference: false },
    { prompt: "What did Thawan put inside the volcano?", options: [{ text: "Baking soda", isCorrect: true }, { text: "Sand", isCorrect: false }, { text: "Water", isCorrect: false }, { text: "Glue", isCorrect: false }, { text: "Flour", isCorrect: false }], isInference: false },
    { prompt: "What happened when Thawan poured vinegar?", options: [{ text: "Foam bubbled up and overflowed.", isCorrect: true }, { text: "Nothing happened.", isCorrect: false }, { text: "The volcano caught fire.", isCorrect: false }, { text: "The paint came off.", isCorrect: false }, { text: "The paper broke.", isCorrect: false }], isInference: false },
    { prompt: "How did Thawan feel about his award?", options: [{ text: "He was very proud.", isCorrect: true }, { text: "He was disappointed.", isCorrect: false }, { text: "He was angry.", isCorrect: false }, { text: "He was scared.", isCorrect: false }, { text: "He did not care.", isCorrect: false }], isInference: false },
    { prompt: "Why did Thawan not feel bad about not winning first place?", options: [{ text: "Because he won the creativity award instead.", isCorrect: true }, { text: "Because he did not want to win.", isCorrect: false }, { text: "Because the judges were wrong.", isCorrect: false }, { text: "Because his friends also lost.", isCorrect: false }, { text: "Because he cheated.", isCorrect: false }], isInference: true },
  ],
];

// Reading 3: most complex, 3 inference per passage
const READING_3_PASSAGES = [
  { title: "The Weather Report", body: "Nong Fah wanted to be a weather reporter when she grew up. Every morning, she looked out the window and wrote about the weather in her notebook.\n\nOn Monday, the sun was bright and the sky was clear. She wrote: \"Sunny and hot.\"\nOn Tuesday, gray clouds covered the sky. In the afternoon, it rained. She wrote: \"Cloudy, then rainy.\"\nOn Wednesday, the wind blew hard. Leaves flew off the trees. She wrote: \"Very windy.\"\nOn Thursday, the sun came back, but the air was cool. She wrote: \"Sunny but cool.\"\nOn Friday, it rained all day long and there was thunder. She wrote: \"Stormy.\"\n\nAt the end of the week, Nong Fah showed her notebook to Teacher Julie. \"You are a very good observer, Nong Fah,\" said Teacher Julie. \"You noticed that weather changes every day.\"" },
  { title: "The Talent Show", body: "The school was having a talent show. Every student could show one special thing they could do.\n\nNong Fah practiced singing a song about the seasons. She sang it over and over until she knew every word.\n\nThawan wanted to do a magic trick. He practiced pulling a ribbon from a hat. But the ribbon always got stuck.\n\n\"I cannot do this trick,\" said Thawan sadly.\n\"Do not give up,\" said Ollie. \"Practice makes perfect.\"\n\nThawan practiced ten more times. On the last try, the ribbon came out smoothly!\n\nAt the talent show, Nong Fah sang beautifully. Everyone clapped. Then Thawan did his magic trick. The ribbon flew out of the hat like a rainbow. Everyone cheered.\n\n\"I am glad I did not give up,\" said Thawan." },
  { title: "The Recycling Project", body: "Teacher Julie told the class about recycling. \"When we recycle, we use old things to make new things,\" she said. \"This helps keep our Earth clean.\"\n\nThe class decided to collect plastic bottles, paper, and cans for one week. They put three bins in the classroom: blue for paper, green for plastic, and yellow for cans.\n\nOn the first day, they collected five bottles and eight pieces of paper. By Friday, the bins were almost full.\n\n\"We collected one hundred and twenty items this week!\" said Nong Fah, counting everything.\n\nThawan had an idea. \"We can also make art from old things!\" He made a robot from old boxes and bottle caps.\n\n\"Recycling is not just good for the Earth,\" said Teacher Julie. \"It also helps us be creative!\"" },
];

const READING_3_QUESTIONS = [
  [
    { prompt: "What does Nong Fah want to be when she grows up?", options: [{ text: "A weather reporter", isCorrect: true }, { text: "A teacher", isCorrect: false }, { text: "A doctor", isCorrect: false }, { text: "A singer", isCorrect: false }, { text: "A scientist", isCorrect: false }], isInference: false },
    { prompt: "What was the weather on Tuesday?", options: [{ text: "Cloudy, then rainy", isCorrect: true }, { text: "Sunny and hot", isCorrect: false }, { text: "Very windy", isCorrect: false }, { text: "Sunny but cool", isCorrect: false }, { text: "Stormy", isCorrect: false }], isInference: false },
    { prompt: "Why did Teacher Julie say Nong Fah is a good observer?", options: [{ text: "Because she carefully noticed and wrote down the weather each day.", isCorrect: true }, { text: "Because she can predict the weather.", isCorrect: false }, { text: "Because she likes science.", isCorrect: false }, { text: "Because she watches television.", isCorrect: false }, { text: "Because she drew pictures.", isCorrect: false }], isInference: true },
    { prompt: "Which day would be the worst for a picnic?", options: [{ text: "Friday, because it was stormy all day.", isCorrect: true }, { text: "Monday, because it was sunny.", isCorrect: false }, { text: "Thursday, because it was cool.", isCorrect: false }, { text: "Wednesday, because it was windy.", isCorrect: false }, { text: "Tuesday, because it rained in the afternoon.", isCorrect: false }], isInference: true },
    { prompt: "What lesson did Nong Fah learn from her week of watching weather?", options: [{ text: "Weather changes every day and is not always the same.", isCorrect: true }, { text: "It always rains on Fridays.", isCorrect: false }, { text: "Sunny days are the best.", isCorrect: false }, { text: "Weather reporters do not need notebooks.", isCorrect: false }, { text: "The wind only blows on Wednesdays.", isCorrect: false }], isInference: true },
  ],
  [
    { prompt: "What did Nong Fah practice for the talent show?", options: [{ text: "Singing a song about the seasons", isCorrect: true }, { text: "Dancing", isCorrect: false }, { text: "A magic trick", isCorrect: false }, { text: "Playing piano", isCorrect: false }, { text: "Drawing a picture", isCorrect: false }], isInference: false },
    { prompt: "What was Thawan's magic trick?", options: [{ text: "Pulling a ribbon from a hat", isCorrect: true }, { text: "Making a coin disappear", isCorrect: false }, { text: "Cutting a rope", isCorrect: false }, { text: "Making cards float", isCorrect: false }, { text: "Pulling a rabbit from a hat", isCorrect: false }], isInference: false },
    { prompt: "What does 'Practice makes perfect' mean?", options: [{ text: "If you keep trying, you will get better.", isCorrect: true }, { text: "You should give up if something is hard.", isCorrect: false }, { text: "You only need to try once.", isCorrect: false }, { text: "Perfect people do not need practice.", isCorrect: false }, { text: "Practice is boring.", isCorrect: false }], isInference: true },
    { prompt: "How many extra times did Thawan practice after Ollie encouraged him?", options: [{ text: "Ten", isCorrect: true }, { text: "Five", isCorrect: false }, { text: "Three", isCorrect: false }, { text: "Twenty", isCorrect: false }, { text: "One", isCorrect: false }], isInference: false },
    { prompt: "Why was Thawan glad he did not give up?", options: [{ text: "Because his trick worked and everyone cheered.", isCorrect: true }, { text: "Because he won first prize.", isCorrect: false }, { text: "Because the teacher gave him extra marks.", isCorrect: false }, { text: "Because Ollie did the trick for him.", isCorrect: false }, { text: "Because the show was canceled.", isCorrect: false }], isInference: true },
  ],
  [
    { prompt: "What does recycling mean?", options: [{ text: "Using old things to make new things.", isCorrect: true }, { text: "Throwing things away.", isCorrect: false }, { text: "Buying new things.", isCorrect: false }, { text: "Breaking old things.", isCorrect: false }, { text: "Hiding old things.", isCorrect: false }], isInference: false },
    { prompt: "What color was the bin for plastic?", options: [{ text: "Green", isCorrect: true }, { text: "Blue", isCorrect: false }, { text: "Yellow", isCorrect: false }, { text: "Red", isCorrect: false }, { text: "White", isCorrect: false }], isInference: false },
    { prompt: "How many items did the class collect in one week?", options: [{ text: "One hundred and twenty", isCorrect: true }, { text: "Fifty", isCorrect: false }, { text: "One hundred", isCorrect: false }, { text: "Eighty", isCorrect: false }, { text: "Two hundred", isCorrect: false }], isInference: false },
    { prompt: "Why is recycling good for the Earth?", options: [{ text: "It helps keep the Earth clean by reusing old things.", isCorrect: true }, { text: "It makes things more expensive.", isCorrect: false }, { text: "It uses more energy.", isCorrect: false }, { text: "It creates more garbage.", isCorrect: false }, { text: "It only helps schools.", isCorrect: false }], isInference: true },
    { prompt: "What extra lesson did the class learn beyond helping the Earth?", options: [{ text: "Recycling helps people be creative.", isCorrect: true }, { text: "Recycling is only for adults.", isCorrect: false }, { text: "You cannot make art from old things.", isCorrect: false }, { text: "Plastic is the best material.", isCorrect: false }, { text: "Collecting cans is boring.", isCorrect: false }], isInference: true },
  ],
];


// ─── STRUCTURE QUIZZES ─────────────────────────────────────

const STRUCTURE_K = [
  { prompt: "The cat is ____ the box.", options: [{ text: "in", isCorrect: true }, { text: "up", isCorrect: false }, { text: "over", isCorrect: false }, { text: "of", isCorrect: false }, { text: "at", isCorrect: false }] },
  { prompt: "I have ____ apple.", options: [{ text: "an", isCorrect: true }, { text: "a", isCorrect: false }, { text: "the", isCorrect: false }, { text: "two", isCorrect: false }, { text: "is", isCorrect: false }] },
  { prompt: "This is ____ dog.", options: [{ text: "a", isCorrect: true }, { text: "an", isCorrect: false }, { text: "is", isCorrect: false }, { text: "are", isCorrect: false }, { text: "am", isCorrect: false }] },
  { prompt: "I ____ happy.", options: [{ text: "am", isCorrect: true }, { text: "is", isCorrect: false }, { text: "are", isCorrect: false }, { text: "was", isCorrect: false }, { text: "be", isCorrect: false }] },
  { prompt: "The bird ____ in the tree.", options: [{ text: "is", isCorrect: true }, { text: "am", isCorrect: false }, { text: "are", isCorrect: false }, { text: "be", isCorrect: false }, { text: "do", isCorrect: false }] },
  { prompt: "Two ____ are on the table.", options: [{ text: "cups", isCorrect: true }, { text: "cup", isCorrect: false }, { text: "cupes", isCorrect: false }, { text: "cupping", isCorrect: false }, { text: "cupped", isCorrect: false }] },
  { prompt: "The ball is ____ the table.", options: [{ text: "on", isCorrect: true }, { text: "in", isCorrect: false }, { text: "up", isCorrect: false }, { text: "of", isCorrect: false }, { text: "at", isCorrect: false }] },
  { prompt: "She ____ a student.", options: [{ text: "is", isCorrect: true }, { text: "am", isCorrect: false }, { text: "are", isCorrect: false }, { text: "be", isCorrect: false }, { text: "do", isCorrect: false }] },
  { prompt: "____ are my friends.", options: [{ text: "They", isCorrect: true }, { text: "He", isCorrect: false }, { text: "She", isCorrect: false }, { text: "It", isCorrect: false }, { text: "I", isCorrect: false }] },
  { prompt: "I ____ see the moon.", options: [{ text: "can", isCorrect: true }, { text: "is", isCorrect: false }, { text: "are", isCorrect: false }, { text: "am", isCorrect: false }, { text: "be", isCorrect: false }] },
  { prompt: "The dog is ____ the house.", options: [{ text: "behind", isCorrect: true }, { text: "over", isCorrect: false }, { text: "up", isCorrect: false }, { text: "of", isCorrect: false }, { text: "about", isCorrect: false }] },
  { prompt: "We ____ at school.", options: [{ text: "are", isCorrect: true }, { text: "is", isCorrect: false }, { text: "am", isCorrect: false }, { text: "be", isCorrect: false }, { text: "was", isCorrect: false }] },
  { prompt: "He ____ a red hat.", options: [{ text: "has", isCorrect: true }, { text: "have", isCorrect: false }, { text: "is", isCorrect: false }, { text: "am", isCorrect: false }, { text: "be", isCorrect: false }] },
  { prompt: "I like ____ milk.", options: [{ text: "to drink", isCorrect: true }, { text: "drinking", isCorrect: false }, { text: "drinked", isCorrect: false }, { text: "drinks", isCorrect: false }, { text: "drank", isCorrect: false }] },
  { prompt: "____ is my pencil?", options: [{ text: "Where", isCorrect: true }, { text: "What", isCorrect: false }, { text: "Who", isCorrect: false }, { text: "When", isCorrect: false }, { text: "How", isCorrect: false }] },
];

const STRUCTURE_1 = [
  { prompt: "I have two ____ and three ____.", options: [{ text: "cats / boxes", isCorrect: true }, { text: "cat / boxes", isCorrect: false }, { text: "cats / box", isCorrect: false }, { text: "cat / box", isCorrect: false }, { text: "cates / boxs", isCorrect: false }] },
  { prompt: "____ is my sister. ____ name is Bua.", options: [{ text: "She / Her", isCorrect: true }, { text: "He / His", isCorrect: false }, { text: "They / Their", isCorrect: false }, { text: "It / Its", isCorrect: false }, { text: "She / His", isCorrect: false }] },
  { prompt: "Yesterday, Thawan ____ to school.", options: [{ text: "walked", isCorrect: true }, { text: "walks", isCorrect: false }, { text: "walking", isCorrect: false }, { text: "will walk", isCorrect: false }, { text: "walk", isCorrect: false }] },
  { prompt: "Tomorrow we ____ to the zoo.", options: [{ text: "will go", isCorrect: true }, { text: "went", isCorrect: false }, { text: "goes", isCorrect: false }, { text: "going", isCorrect: false }, { text: "was going", isCorrect: false }] },
  { prompt: "____ an apple on the table.", options: [{ text: "There is", isCorrect: true }, { text: "There are", isCorrect: false }, { text: "Here are", isCorrect: false }, { text: "They are", isCorrect: false }, { text: "It are", isCorrect: false }] },
  { prompt: "The elephant is ____ than the mouse.", options: [{ text: "bigger", isCorrect: true }, { text: "big", isCorrect: false }, { text: "biggest", isCorrect: false }, { text: "more big", isCorrect: false }, { text: "most big", isCorrect: false }] },
  { prompt: "Nong Fah ____ her homework every day.", options: [{ text: "does", isCorrect: true }, { text: "do", isCorrect: false }, { text: "doing", isCorrect: false }, { text: "done", isCorrect: false }, { text: "are doing", isCorrect: false }] },
  { prompt: "I would like ____ orange and ____ banana.", options: [{ text: "an / a", isCorrect: true }, { text: "a / a", isCorrect: false }, { text: "an / an", isCorrect: false }, { text: "a / an", isCorrect: false }, { text: "the / an", isCorrect: false }] },
  { prompt: "How ____ water is in the glass?", options: [{ text: "much", isCorrect: true }, { text: "many", isCorrect: false }, { text: "any", isCorrect: false }, { text: "few", isCorrect: false }, { text: "some", isCorrect: false }] },
  { prompt: "Look at ____ beautiful flowers!", options: [{ text: "those", isCorrect: true }, { text: "that", isCorrect: false }, { text: "this", isCorrect: false }, { text: "it", isCorrect: false }, { text: "a", isCorrect: false }] },
  { prompt: "The children ____ playing in the park.", options: [{ text: "are", isCorrect: true }, { text: "is", isCorrect: false }, { text: "am", isCorrect: false }, { text: "was", isCorrect: false }, { text: "be", isCorrect: false }] },
  { prompt: "This book is ____. That book is ____.", options: [{ text: "mine / yours", isCorrect: true }, { text: "my / your", isCorrect: false }, { text: "I / you", isCorrect: false }, { text: "me / you", isCorrect: false }, { text: "mine / your", isCorrect: false }] },
  { prompt: "Ollie can ____ very fast.", options: [{ text: "fly", isCorrect: true }, { text: "flies", isCorrect: false }, { text: "flying", isCorrect: false }, { text: "flew", isCorrect: false }, { text: "flown", isCorrect: false }] },
  { prompt: "There ____ many stars in the sky.", options: [{ text: "are", isCorrect: true }, { text: "is", isCorrect: false }, { text: "am", isCorrect: false }, { text: "was", isCorrect: false }, { text: "be", isCorrect: false }] },
  { prompt: "The dog is ____ than the cat.", options: [{ text: "faster", isCorrect: true }, { text: "fast", isCorrect: false }, { text: "fastest", isCorrect: false }, { text: "more fast", isCorrect: false }, { text: "most fast", isCorrect: false }] },
];

const STRUCTURE_2 = [
  { prompt: "The cat is sleeping ____ the box, and the box is ____ the table.", options: [{ text: "in / under", isCorrect: true }, { text: "around / in", isCorrect: false }, { text: "between / under", isCorrect: false }, { text: "in / around", isCorrect: false }, { text: "through / in", isCorrect: false }] },
  { prompt: "____ books are mine, and ____ book over there is yours.", options: [{ text: "These / that", isCorrect: true }, { text: "This / that", isCorrect: false }, { text: "Those / these", isCorrect: false }, { text: "That / those", isCorrect: false }, { text: "This / these", isCorrect: false }] },
  { prompt: "____ you please help me?", options: [{ text: "Could", isCorrect: true }, { text: "Was", isCorrect: false }, { text: "Have", isCorrect: false }, { text: "Am", isCorrect: false }, { text: "Did", isCorrect: false }] },
  { prompt: "If it rains, we ____ stay inside.", options: [{ text: "will", isCorrect: true }, { text: "was", isCorrect: false }, { text: "are", isCorrect: false }, { text: "did", isCorrect: false }, { text: "am", isCorrect: false }] },
  { prompt: "Thawan ____ already ____ his lunch.", options: [{ text: "has / eaten", isCorrect: true }, { text: "have / ate", isCorrect: false }, { text: "is / eating", isCorrect: false }, { text: "was / eat", isCorrect: false }, { text: "has / ate", isCorrect: false }] },
  { prompt: "Nong Fah is the ____ student in the class.", options: [{ text: "tallest", isCorrect: true }, { text: "taller", isCorrect: false }, { text: "tall", isCorrect: false }, { text: "more tall", isCorrect: false }, { text: "most tall", isCorrect: false }] },
  { prompt: "She ____ to school every day, but today she ____ at home.", options: [{ text: "goes / is", isCorrect: true }, { text: "go / are", isCorrect: false }, { text: "went / am", isCorrect: false }, { text: "going / was", isCorrect: false }, { text: "gone / were", isCorrect: false }] },
  { prompt: "The boy ____ is wearing a blue shirt is my brother.", options: [{ text: "who", isCorrect: true }, { text: "which", isCorrect: false }, { text: "where", isCorrect: false }, { text: "when", isCorrect: false }, { text: "what", isCorrect: false }] },
  { prompt: "We have ____ homework tonight.", options: [{ text: "some", isCorrect: true }, { text: "a", isCorrect: false }, { text: "an", isCorrect: false }, { text: "many", isCorrect: false }, { text: "few", isCorrect: false }] },
  { prompt: "Neither Thawan ____ Nong Fah likes spiders.", options: [{ text: "nor", isCorrect: true }, { text: "or", isCorrect: false }, { text: "and", isCorrect: false }, { text: "but", isCorrect: false }, { text: "so", isCorrect: false }] },
  { prompt: "The children must ____ their teeth before bed.", options: [{ text: "brush", isCorrect: true }, { text: "brushes", isCorrect: false }, { text: "brushing", isCorrect: false }, { text: "brushed", isCorrect: false }, { text: "to brushes", isCorrect: false }] },
  { prompt: "Ollie is ____ than Thawan, but Nong Fah is the ____.", options: [{ text: "shorter / shortest", isCorrect: true }, { text: "short / shorter", isCorrect: false }, { text: "more short / most short", isCorrect: false }, { text: "shorter / most short", isCorrect: false }, { text: "short / shortest", isCorrect: false }] },
  { prompt: "I saw the movie ____ was on television last night.", options: [{ text: "that", isCorrect: true }, { text: "who", isCorrect: false }, { text: "when", isCorrect: false }, { text: "where", isCorrect: false }, { text: "how", isCorrect: false }] },
  { prompt: "While Thawan ____, it started to rain.", options: [{ text: "was playing", isCorrect: true }, { text: "plays", isCorrect: false }, { text: "played", isCorrect: false }, { text: "will play", isCorrect: false }, { text: "play", isCorrect: false }] },
  { prompt: "She asked me ____ I wanted to play.", options: [{ text: "if", isCorrect: true }, { text: "but", isCorrect: false }, { text: "so", isCorrect: false }, { text: "or", isCorrect: false }, { text: "yet", isCorrect: false }] },
];

const STRUCTURE_3 = [
  { prompt: "If Thawan ____ harder, he would have passed the test.", options: [{ text: "had studied", isCorrect: true }, { text: "studies", isCorrect: false }, { text: "studying", isCorrect: false }, { text: "will study", isCorrect: false }, { text: "has studied", isCorrect: false }] },
  { prompt: "The book ____ by Nong Fah was very interesting.", options: [{ text: "written", isCorrect: true }, { text: "writing", isCorrect: false }, { text: "wrote", isCorrect: false }, { text: "write", isCorrect: false }, { text: "writes", isCorrect: false }] },
  { prompt: "Not only ____ she sing well, but she also dances beautifully.", options: [{ text: "does", isCorrect: true }, { text: "do", isCorrect: false }, { text: "did", isCorrect: false }, { text: "was", isCorrect: false }, { text: "is", isCorrect: false }] },
  { prompt: "Thawan enjoys ____ football after school.", options: [{ text: "playing", isCorrect: true }, { text: "play", isCorrect: false }, { text: "played", isCorrect: false }, { text: "plays", isCorrect: false }, { text: "to plays", isCorrect: false }] },
  { prompt: "The cake ____ by Mom yesterday was delicious.", options: [{ text: "made", isCorrect: true }, { text: "making", isCorrect: false }, { text: "makes", isCorrect: false }, { text: "make", isCorrect: false }, { text: "maked", isCorrect: false }] },
  { prompt: "By the time we arrived, the movie ____ already ____.", options: [{ text: "had / started", isCorrect: true }, { text: "has / start", isCorrect: false }, { text: "have / starting", isCorrect: false }, { text: "was / starts", isCorrect: false }, { text: "is / started", isCorrect: false }] },
  { prompt: "She is the girl ____ father is a pilot.", options: [{ text: "whose", isCorrect: true }, { text: "who", isCorrect: false }, { text: "which", isCorrect: false }, { text: "whom", isCorrect: false }, { text: "that", isCorrect: false }] },
  { prompt: "The teacher told us ____ finish our homework before Friday.", options: [{ text: "to", isCorrect: true }, { text: "for", isCorrect: false }, { text: "at", isCorrect: false }, { text: "on", isCorrect: false }, { text: "with", isCorrect: false }] },
  { prompt: "Although it was raining, ____ went to the park.", options: [{ text: "they still", isCorrect: true }, { text: "they did", isCorrect: false }, { text: "but they", isCorrect: false }, { text: "they never", isCorrect: false }, { text: "or they", isCorrect: false }] },
  { prompt: "Nong Fah asked Thawan ____ he had finished his project.", options: [{ text: "whether", isCorrect: true }, { text: "which", isCorrect: false }, { text: "who", isCorrect: false }, { text: "what", isCorrect: false }, { text: "how much", isCorrect: false }] },
  { prompt: "The more you practice, the ____ you will become.", options: [{ text: "better", isCorrect: true }, { text: "good", isCorrect: false }, { text: "best", isCorrect: false }, { text: "well", isCorrect: false }, { text: "gooder", isCorrect: false }] },
  { prompt: "Either you come with us ____ you stay at home.", options: [{ text: "or", isCorrect: true }, { text: "and", isCorrect: false }, { text: "but", isCorrect: false }, { text: "nor", isCorrect: false }, { text: "so", isCorrect: false }] },
  { prompt: "Thawan wished he ____ fly like Ollie.", options: [{ text: "could", isCorrect: true }, { text: "can", isCorrect: false }, { text: "will", isCorrect: false }, { text: "does", isCorrect: false }, { text: "is", isCorrect: false }] },
  { prompt: "Each of the students ____ given a prize.", options: [{ text: "was", isCorrect: true }, { text: "were", isCorrect: false }, { text: "are", isCorrect: false }, { text: "have", isCorrect: false }, { text: "be", isCorrect: false }] },
  { prompt: "Having ____ her chores, Nong Fah went out to play.", options: [{ text: "finished", isCorrect: true }, { text: "finish", isCorrect: false }, { text: "finishing", isCorrect: false }, { text: "finishes", isCorrect: false }, { text: "to finish", isCorrect: false }] },
];

// ─── VOCABULARY QUIZZES ─────────────────────────────────────

const VOCABULARY_K = [
  { prompt: "A ____ is a fruit. It is red or green.", options: [{ text: "apple", isCorrect: true }, { text: "car", isCorrect: false }, { text: "chair", isCorrect: false }, { text: "book", isCorrect: false }, { text: "hat", isCorrect: false }] },
  { prompt: "We write with a ____.", options: [{ text: "pencil", isCorrect: true }, { text: "cup", isCorrect: false }, { text: "ball", isCorrect: false }, { text: "shoe", isCorrect: false }, { text: "plate", isCorrect: false }] },
  { prompt: "A ____ says 'moo'.", options: [{ text: "cow", isCorrect: true }, { text: "cat", isCorrect: false }, { text: "dog", isCorrect: false }, { text: "bird", isCorrect: false }, { text: "fish", isCorrect: false }] },
  { prompt: "We use our ____ to see.", options: [{ text: "eyes", isCorrect: true }, { text: "ears", isCorrect: false }, { text: "hands", isCorrect: false }, { text: "mouth", isCorrect: false }, { text: "nose", isCorrect: false }] },
  { prompt: "The sky is ____.", options: [{ text: "blue", isCorrect: true }, { text: "red", isCorrect: false }, { text: "green", isCorrect: false }, { text: "pink", isCorrect: false }, { text: "black", isCorrect: false }] },
  { prompt: "We sleep in a ____.", options: [{ text: "bed", isCorrect: true }, { text: "table", isCorrect: false }, { text: "chair", isCorrect: false }, { text: "desk", isCorrect: false }, { text: "tree", isCorrect: false }] },
  { prompt: "A ____ has four legs and says 'woof'.", options: [{ text: "dog", isCorrect: true }, { text: "bird", isCorrect: false }, { text: "fish", isCorrect: false }, { text: "frog", isCorrect: false }, { text: "snake", isCorrect: false }] },
  { prompt: "We wear ____ on our feet.", options: [{ text: "shoes", isCorrect: true }, { text: "hats", isCorrect: false }, { text: "shirts", isCorrect: false }, { text: "glasses", isCorrect: false }, { text: "gloves", isCorrect: false }] },
  { prompt: "The sun is ____.", options: [{ text: "hot", isCorrect: true }, { text: "cold", isCorrect: false }, { text: "wet", isCorrect: false }, { text: "dark", isCorrect: false }, { text: "soft", isCorrect: false }] },
  { prompt: "We drink ____.", options: [{ text: "water", isCorrect: true }, { text: "bread", isCorrect: false }, { text: "rice", isCorrect: false }, { text: "cake", isCorrect: false }, { text: "fish", isCorrect: false }] },
  { prompt: "A ____ is round. We can kick it.", options: [{ text: "ball", isCorrect: true }, { text: "book", isCorrect: false }, { text: "pen", isCorrect: false }, { text: "box", isCorrect: false }, { text: "chair", isCorrect: false }] },
  { prompt: "We eat food in the ____.", options: [{ text: "kitchen", isCorrect: true }, { text: "bathroom", isCorrect: false }, { text: "bedroom", isCorrect: false }, { text: "garden", isCorrect: false }, { text: "garage", isCorrect: false }] },
  { prompt: "A ____ has wings and can fly.", options: [{ text: "bird", isCorrect: true }, { text: "dog", isCorrect: false }, { text: "cat", isCorrect: false }, { text: "fish", isCorrect: false }, { text: "cow", isCorrect: false }] },
  { prompt: "We use our ____ to hear.", options: [{ text: "ears", isCorrect: true }, { text: "eyes", isCorrect: false }, { text: "nose", isCorrect: false }, { text: "mouth", isCorrect: false }, { text: "hands", isCorrect: false }] },
  { prompt: "Ice cream is ____.", options: [{ text: "cold", isCorrect: true }, { text: "hot", isCorrect: false }, { text: "hard", isCorrect: false }, { text: "dry", isCorrect: false }, { text: "loud", isCorrect: false }] },
];

const VOCABULARY_1 = [
  { prompt: "The opposite of 'big' is ____.", options: [{ text: "small", isCorrect: true }, { text: "tall", isCorrect: false }, { text: "fast", isCorrect: false }, { text: "heavy", isCorrect: false }, { text: "old", isCorrect: false }] },
  { prompt: "A doctor works in a ____.", options: [{ text: "hospital", isCorrect: true }, { text: "school", isCorrect: false }, { text: "farm", isCorrect: false }, { text: "kitchen", isCorrect: false }, { text: "park", isCorrect: false }] },
  { prompt: "We use an ____ when it rains.", options: [{ text: "umbrella", isCorrect: true }, { text: "hat", isCorrect: false }, { text: "shoe", isCorrect: false }, { text: "bag", isCorrect: false }, { text: "ball", isCorrect: false }] },
  { prompt: "The opposite of 'hot' is ____.", options: [{ text: "cold", isCorrect: true }, { text: "warm", isCorrect: false }, { text: "fast", isCorrect: false }, { text: "new", isCorrect: false }, { text: "dry", isCorrect: false }] },
  { prompt: "We read a ____ to learn new things.", options: [{ text: "book", isCorrect: true }, { text: "plate", isCorrect: false }, { text: "spoon", isCorrect: false }, { text: "blanket", isCorrect: false }, { text: "pillow", isCorrect: false }] },
  { prompt: "A ____ takes people to different places. It has wheels.", options: [{ text: "bus", isCorrect: true }, { text: "tree", isCorrect: false }, { text: "bridge", isCorrect: false }, { text: "house", isCorrect: false }, { text: "chair", isCorrect: false }] },
  { prompt: "The opposite of 'happy' is ____.", options: [{ text: "sad", isCorrect: true }, { text: "angry", isCorrect: false }, { text: "tired", isCorrect: false }, { text: "hungry", isCorrect: false }, { text: "tall", isCorrect: false }] },
  { prompt: "A ____ grows in the garden and has petals.", options: [{ text: "flower", isCorrect: true }, { text: "rock", isCorrect: false }, { text: "fence", isCorrect: false }, { text: "path", isCorrect: false }, { text: "bench", isCorrect: false }] },
  { prompt: "We wash our hands with ____ and water.", options: [{ text: "soap", isCorrect: true }, { text: "paint", isCorrect: false }, { text: "glue", isCorrect: false }, { text: "sand", isCorrect: false }, { text: "chalk", isCorrect: false }] },
  { prompt: "The day after Monday is ____.", options: [{ text: "Tuesday", isCorrect: true }, { text: "Wednesday", isCorrect: false }, { text: "Sunday", isCorrect: false }, { text: "Friday", isCorrect: false }, { text: "Saturday", isCorrect: false }] },
  { prompt: "Another word for 'glad' is ____.", options: [{ text: "happy", isCorrect: true }, { text: "sad", isCorrect: false }, { text: "angry", isCorrect: false }, { text: "tired", isCorrect: false }, { text: "scared", isCorrect: false }] },
  { prompt: "We cut paper with ____.", options: [{ text: "scissors", isCorrect: true }, { text: "a spoon", isCorrect: false }, { text: "a cup", isCorrect: false }, { text: "a ball", isCorrect: false }, { text: "a brush", isCorrect: false }] },
  { prompt: "A ____ is a large body of water.", options: [{ text: "sea", isCorrect: true }, { text: "cup", isCorrect: false }, { text: "glass", isCorrect: false }, { text: "bowl", isCorrect: false }, { text: "pot", isCorrect: false }] },
  { prompt: "The season when it is very hot in Thailand is ____.", options: [{ text: "the hot season", isCorrect: true }, { text: "the rainy season", isCorrect: false }, { text: "the cool season", isCorrect: false }, { text: "winter", isCorrect: false }, { text: "autumn", isCorrect: false }] },
  { prompt: "The opposite of 'fast' is ____.", options: [{ text: "slow", isCorrect: true }, { text: "quick", isCorrect: false }, { text: "big", isCorrect: false }, { text: "loud", isCorrect: false }, { text: "tall", isCorrect: false }] },
];

const VOCABULARY_2 = [
  { prompt: "To ____ means to move quickly on foot.", options: [{ text: "run", isCorrect: true }, { text: "sit", isCorrect: false }, { text: "sleep", isCorrect: false }, { text: "read", isCorrect: false }, { text: "eat", isCorrect: false }] },
  { prompt: "A ____ is something you wear on your head.", options: [{ text: "hat", isCorrect: true }, { text: "shoe", isCorrect: false }, { text: "sock", isCorrect: false }, { text: "belt", isCorrect: false }, { text: "ring", isCorrect: false }] },
  { prompt: "Another word for 'begin' is ____.", options: [{ text: "start", isCorrect: true }, { text: "stop", isCorrect: false }, { text: "finish", isCorrect: false }, { text: "end", isCorrect: false }, { text: "close", isCorrect: false }] },
  { prompt: "An animal that lives in water is a ____.", options: [{ text: "fish", isCorrect: true }, { text: "cow", isCorrect: false }, { text: "horse", isCorrect: false }, { text: "chicken", isCorrect: false }, { text: "cat", isCorrect: false }] },
  { prompt: "The opposite of 'empty' is ____.", options: [{ text: "full", isCorrect: true }, { text: "open", isCorrect: false }, { text: "new", isCorrect: false }, { text: "clean", isCorrect: false }, { text: "light", isCorrect: false }] },
  { prompt: "To ____ means to make food ready to eat.", options: [{ text: "cook", isCorrect: true }, { text: "wash", isCorrect: false }, { text: "clean", isCorrect: false }, { text: "draw", isCorrect: false }, { text: "sing", isCorrect: false }] },
  { prompt: "A ____ is a person who teaches at a school.", options: [{ text: "teacher", isCorrect: true }, { text: "doctor", isCorrect: false }, { text: "farmer", isCorrect: false }, { text: "driver", isCorrect: false }, { text: "pilot", isCorrect: false }] },
  { prompt: "The opposite of 'easy' is ____.", options: [{ text: "difficult", isCorrect: true }, { text: "simple", isCorrect: false }, { text: "fast", isCorrect: false }, { text: "small", isCorrect: false }, { text: "soft", isCorrect: false }] },
  { prompt: "Another word for 'brave' is ____.", options: [{ text: "courageous", isCorrect: true }, { text: "scared", isCorrect: false }, { text: "shy", isCorrect: false }, { text: "angry", isCorrect: false }, { text: "lazy", isCorrect: false }] },
  { prompt: "A group of fish swimming together is called a ____.", options: [{ text: "school", isCorrect: true }, { text: "herd", isCorrect: false }, { text: "pack", isCorrect: false }, { text: "flock", isCorrect: false }, { text: "team", isCorrect: false }] },
  { prompt: "To ____ means to look at words and understand them.", options: [{ text: "read", isCorrect: true }, { text: "write", isCorrect: false }, { text: "draw", isCorrect: false }, { text: "sing", isCorrect: false }, { text: "dance", isCorrect: false }] },
  { prompt: "The place where airplanes take off and land is an ____.", options: [{ text: "airport", isCorrect: true }, { text: "hospital", isCorrect: false }, { text: "school", isCorrect: false }, { text: "office", isCorrect: false }, { text: "market", isCorrect: false }] },
  { prompt: "The opposite of 'gentle' is ____.", options: [{ text: "rough", isCorrect: true }, { text: "kind", isCorrect: false }, { text: "soft", isCorrect: false }, { text: "warm", isCorrect: false }, { text: "sweet", isCorrect: false }] },
  { prompt: "Something that is not real is ____.", options: [{ text: "imaginary", isCorrect: true }, { text: "beautiful", isCorrect: false }, { text: "important", isCorrect: false }, { text: "natural", isCorrect: false }, { text: "colorful", isCorrect: false }] },
  { prompt: "When you feel ____, you want to eat.", options: [{ text: "hungry", isCorrect: true }, { text: "thirsty", isCorrect: false }, { text: "sleepy", isCorrect: false }, { text: "angry", isCorrect: false }, { text: "cold", isCorrect: false }] },
];

const VOCABULARY_3 = [
  { prompt: "To ____ means to find out the answer by thinking.", options: [{ text: "solve", isCorrect: true }, { text: "forget", isCorrect: false }, { text: "ignore", isCorrect: false }, { text: "break", isCorrect: false }, { text: "hide", isCorrect: false }] },
  { prompt: "Another word for 'enormous' is ____.", options: [{ text: "huge", isCorrect: true }, { text: "tiny", isCorrect: false }, { text: "narrow", isCorrect: false }, { text: "shallow", isCorrect: false }, { text: "thin", isCorrect: false }] },
  { prompt: "A ____ is a person who flies an airplane.", options: [{ text: "pilot", isCorrect: true }, { text: "driver", isCorrect: false }, { text: "sailor", isCorrect: false }, { text: "farmer", isCorrect: false }, { text: "teacher", isCorrect: false }] },
  { prompt: "The opposite of 'ancient' is ____.", options: [{ text: "modern", isCorrect: true }, { text: "old", isCorrect: false }, { text: "broken", isCorrect: false }, { text: "heavy", isCorrect: false }, { text: "dark", isCorrect: false }] },
  { prompt: "To ____ is to say you are sorry for something.", options: [{ text: "apologize", isCorrect: true }, { text: "complain", isCorrect: false }, { text: "celebrate", isCorrect: false }, { text: "whisper", isCorrect: false }, { text: "shout", isCorrect: false }] },
  { prompt: "Something that happens every day is ____.", options: [{ text: "daily", isCorrect: true }, { text: "weekly", isCorrect: false }, { text: "monthly", isCorrect: false }, { text: "yearly", isCorrect: false }, { text: "rarely", isCorrect: false }] },
  { prompt: "The opposite of 'expensive' is ____.", options: [{ text: "cheap", isCorrect: true }, { text: "heavy", isCorrect: false }, { text: "large", isCorrect: false }, { text: "bright", isCorrect: false }, { text: "difficult", isCorrect: false }] },
  { prompt: "To ____ means to change from solid ice to liquid water.", options: [{ text: "melt", isCorrect: true }, { text: "freeze", isCorrect: false }, { text: "boil", isCorrect: false }, { text: "burn", isCorrect: false }, { text: "break", isCorrect: false }] },
  { prompt: "An ____ is a person who creates things with paint or clay.", options: [{ text: "artist", isCorrect: true }, { text: "athlete", isCorrect: false }, { text: "astronaut", isCorrect: false }, { text: "architect", isCorrect: false }, { text: "author", isCorrect: false }] },
  { prompt: "Another word for 'scared' is ____.", options: [{ text: "frightened", isCorrect: true }, { text: "excited", isCorrect: false }, { text: "bored", isCorrect: false }, { text: "proud", isCorrect: false }, { text: "surprised", isCorrect: false }] },
  { prompt: "The ____ of a tree grow underground.", options: [{ text: "roots", isCorrect: true }, { text: "leaves", isCorrect: false }, { text: "branches", isCorrect: false }, { text: "flowers", isCorrect: false }, { text: "fruits", isCorrect: false }] },
  { prompt: "To ____ means to keep something safe from harm.", options: [{ text: "protect", isCorrect: true }, { text: "destroy", isCorrect: false }, { text: "attack", isCorrect: false }, { text: "ignore", isCorrect: false }, { text: "forget", isCorrect: false }] },
  { prompt: "Something that is ____ can bend without breaking.", options: [{ text: "flexible", isCorrect: true }, { text: "rigid", isCorrect: false }, { text: "fragile", isCorrect: false }, { text: "heavy", isCorrect: false }, { text: "sharp", isCorrect: false }] },
  { prompt: "The opposite of 'noisy' is ____.", options: [{ text: "quiet", isCorrect: true }, { text: "loud", isCorrect: false }, { text: "fast", isCorrect: false }, { text: "bright", isCorrect: false }, { text: "heavy", isCorrect: false }] },
  { prompt: "When you ____ something, you say it is true.", options: [{ text: "confirm", isCorrect: true }, { text: "deny", isCorrect: false }, { text: "forget", isCorrect: false }, { text: "doubt", isCorrect: false }, { text: "ignore", isCorrect: false }] },
];

// ─── Main insertion logic ─────────────────────────────────

async function insertQuiz(assessmentId, section, questions, passages = null, passageQuestions = null) {
  // For reading quizzes with passages
  if (passages && passageQuestions) {
    const passageInserts = [];
    for (let pi = 0; pi < passages.length; pi++) {
      const p = passages[pi];
      const { data, error } = await supabase
        .from("assessment_passages")
        .insert({
          assessment_id: assessmentId,
          sort_order: pi + 1,
          title_en: p.title,
          body_en: p.body,
        })
        .select("id")
        .single();
      if (error) { console.error("Passage insert error:", error); return; }
      passageInserts.push({ passageId: data.id, questions: passageQuestions[pi] });
    }

    let itemNumber = 1;
    for (const { passageId, questions: pqs } of passageInserts) {
      for (const q of pqs) {
        const shuffledOptions = shuffleCorrectOption(q.options);
        const { data: qData, error: qErr } = await supabase
          .from("assessment_questions")
          .insert({
            assessment_id: assessmentId,
            passage_id: passageId,
            item_number: itemNumber,
            part: section,
            points: 1,
            prompt_en: q.prompt,
            answer_type: "multiple_choice",
            is_inference: q.isInference || false,
          })
          .select("id")
          .single();
        if (qErr) { console.error("Q insert error:", qErr); return; }

        const optRows = shuffledOptions.map((o) => ({
          question_id: qData.id,
          option_number: o.option_number,
          text_en: o.text_en,
          is_correct: o.is_correct,
        }));
        const { error: oErr } = await supabase.from("assessment_options").insert(optRows);
        if (oErr) { console.error("Options insert error:", oErr); return; }

        itemNumber++;
      }
    }
    console.log(`  Inserted ${itemNumber - 1} reading questions with ${passages.length} passages for ${assessmentId}`);
    return;
  }

  // For non-reading quizzes (expression, structure, vocabulary)
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const shuffledOptions = shuffleCorrectOption(q.options);

    const insertData = {
      assessment_id: assessmentId,
      item_number: i + 1,
      part: section,
      points: 1,
      prompt_en: q.prompt,
      answer_type: "multiple_choice",
      is_inference: false,
    };

    // Expression questions have situation and dialogue
    if (section === "expression") {
      insertData.situation_en = q.situation || null;
      insertData.dialogue_en = q.dialogue || null;
    }

    const { data: qData, error: qErr } = await supabase
      .from("assessment_questions")
      .insert(insertData)
      .select("id")
      .single();
    if (qErr) { console.error("Q insert error:", qErr, insertData); return; }

    const optRows = shuffledOptions.map((o) => ({
      question_id: qData.id,
      option_number: o.option_number,
      text_en: o.text_en,
      is_correct: o.is_correct,
    }));
    const { error: oErr } = await supabase.from("assessment_options").insert(optRows);
    if (oErr) { console.error("Options insert error:", oErr); return; }
  }
  console.log(`  Inserted ${questions.length} questions for ${section} quiz ${assessmentId}`);
}

async function main() {
  console.log("Loading practice quizzes...");

  // Expression
  console.log("Expression quizzes:");
  await insertQuiz(ASSESSMENT_IDS.expression_K, "expression", EXPRESSION_K);
  await insertQuiz(ASSESSMENT_IDS.expression_1, "expression", EXPRESSION_1);
  await insertQuiz(ASSESSMENT_IDS.expression_2, "expression", EXPRESSION_2);
  await insertQuiz(ASSESSMENT_IDS.expression_3, "expression", EXPRESSION_3);

  // Reading (with passages)
  console.log("Reading quizzes:");
  await insertQuiz(ASSESSMENT_IDS.reading_K, "reading", null, READING_K_PASSAGES, READING_K_QUESTIONS);
  await insertQuiz(ASSESSMENT_IDS.reading_1, "reading", null, READING_1_PASSAGES, READING_1_QUESTIONS);
  await insertQuiz(ASSESSMENT_IDS.reading_2, "reading", null, READING_2_PASSAGES, READING_2_QUESTIONS);
  await insertQuiz(ASSESSMENT_IDS.reading_3, "reading", null, READING_3_PASSAGES, READING_3_QUESTIONS);

  // Structure
  console.log("Structure quizzes:");
  await insertQuiz(ASSESSMENT_IDS.structure_K, "structure", STRUCTURE_K);
  await insertQuiz(ASSESSMENT_IDS.structure_1, "structure", STRUCTURE_1);
  await insertQuiz(ASSESSMENT_IDS.structure_2, "structure", STRUCTURE_2);
  await insertQuiz(ASSESSMENT_IDS.structure_3, "structure", STRUCTURE_3);

  // Vocabulary
  console.log("Vocabulary quizzes:");
  await insertQuiz(ASSESSMENT_IDS.vocabulary_K, "vocabulary", VOCABULARY_K);
  await insertQuiz(ASSESSMENT_IDS.vocabulary_1, "vocabulary", VOCABULARY_1);
  await insertQuiz(ASSESSMENT_IDS.vocabulary_2, "vocabulary", VOCABULARY_2);
  await insertQuiz(ASSESSMENT_IDS.vocabulary_3, "vocabulary", VOCABULARY_3);

  console.log("\nDone! All 16 practice quizzes loaded.");

  // Verification
  const { data: counts } = await supabase
    .from("assessments")
    .select("id, title_en, section, grade_band")
    .eq("kind", "practice_quiz")
    .order("section")
    .order("grade_band");

  console.log("\nVerification - Practice quizzes in DB:");
  for (const a of counts || []) {
    const { count } = await supabase
      .from("assessment_questions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", a.id);
    console.log(`  ${a.title_en}: ${count} questions`);
  }
}

main().catch(console.error);
