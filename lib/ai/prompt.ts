/** Max characters of post body sent to the model — token thrift. */
export const MAX_BODY_CHARS = 2000;

export interface PromptPost {
  index: number;
  title: string;
  body: string | null;
}

/**
 * The analyst prompt sent to Gemini. Instructs the model to return ONLY a JSON
 * array (no markdown, no prose) of validated pain points. `{{POSTS_JSON}}` is
 * replaced by the batch payload in buildPrompt().
 */
export const PROMPT_TEMPLATE = `Kamu adalah analis produk senior yang membantu seorang software engineer
menemukan ide proyek yang layak dikerjakan.

Kamu akan menerima beberapa post dari forum internet. Tugasmu: identifikasi
mana yang mengandung PAIN POINT NYATA dan bisa dijadikan proyek software.

## Kriteria pain point yang valid

Post HARUS menunjukkan:
- Seseorang mendeskripsikan frustrasi, inefisiensi, atau kebutuhan yang
  belum terpenuhi
- Masalahnya spesifik dan konkret, bukan keluhan filosofis
- Berpotensi diselesaikan dengan software

## TOLAK post yang berupa

- Sekadar berbagi berita atau pengumuman
- Debat opini tanpa masalah konkret ("X lebih baik dari Y")
- Iklan atau promosi produk sendiri
- Pertanyaan yang jawabannya tinggal cari di dokumentasi
- Masalah yang butuh hardware, lisensi mahal, atau data eksklusif
- Keluhan terlalu umum ("internet lambat", "hidup susah")

Lebih baik mengembalikan array kosong daripada memaksakan post yang lemah.
Kualitas jauh lebih penting daripada kuantitas.

## Format output

Kembalikan HANYA JSON array valid. Tanpa markdown, tanpa backtick,
tanpa penjelasan apa pun sebelum atau sesudah.

[
  {
    "post_index": 0,
    "pain_point": "Masalahnya apa, 1-2 kalimat, konkret",
    "target_user": "Siapa yang mengalami ini, spesifik",
    "existing_workaround": "Apa yang mereka pakai sekarang, atau null",
    "solution_pitch": "Aplikasi seperti apa yang menyelesaikan ini, 1-2 kalimat",
    "mvp_scope": "Fitur paling minimum yang sudah berguna, 1 kalimat",
    "effort": "weekend | 1_week | 1_month | too_big",
    "suggested_stack": ["teknologi", "yang", "cocok"],
    "portfolio_value": "Skill apa yang ditunjukkan proyek ini",
    "pain_intensity": "low | medium | high",
    "willingness_to_pay": true
  }
]

## Panduan tiap field

- post_index — indeks post di input, dimulai dari 0
- effort — estimasi jujur untuk satu developer. Gunakan too_big bila
  butuh tim, dana, atau lebih dari sebulan
- pain_intensity — high hanya jika ada bahasa emosional kuat atau
  masalah menghambat pekerjaan; medium untuk gangguan nyata tapi
  bisa ditoleransi; low untuk sekadar preferensi
- willingness_to_pay — true HANYA jika ada sinyal eksplisit:
  menyebut mau bayar, sudah bayar untuk solusi buruk, atau ini masalah
  bisnis yang jelas merugikan uang. Jangan menebak
- suggested_stack — maksimal 5 item, konkret (bukan "web technologies")

Jika sebuah post tidak memenuhi kriteria, jangan sertakan dalam array.

## POSTS

{{POSTS_JSON}}`;

/**
 * Build the full prompt for a batch. Each post body is clamped to
 * MAX_BODY_CHARS before serialization to keep token usage down.
 */
export function buildPrompt(posts: PromptPost[]): string {
  const payload = posts.map((p) => ({
    post_index: p.index,
    title: p.title,
    body: p.body ? p.body.slice(0, MAX_BODY_CHARS) : null,
  }));
  return PROMPT_TEMPLATE.replace('{{POSTS_JSON}}', JSON.stringify(payload, null, 2));
}
