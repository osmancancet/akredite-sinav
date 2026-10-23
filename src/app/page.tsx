import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  FileArchive,
  FileText,
  FlaskConical,
  KeyRound,
  LayoutGrid,
  LineChart,
  Lock,
  Microscope,
  Network,
  Plane,
  ShieldCheck,
  Sparkles,
  WifiOff,
  FolderCheck,
} from "lucide-react";
import { ACCREDITATION_BODIES, YOKAK_REGISTRY_ACCESSED, YOKAK_REGISTRY_URL } from "@/lib/accreditationBodies";
import { UNIVERSITIES } from "@/lib/universities";
import frameworkIndex from "../../public/frameworks/index.json";
import type { FrameworkIndexEntry } from "@/lib/accreditation/types";
import { HashRedirect, HeroLattice, LandingNav } from "@/components/landing/LandingClient";
import { BrandMark } from "@/components/shell/BrandMark";

const FEATURES = [
  { icon: FileText, title: "Sınav kağıdı ve belirtke", body: "Her soru ÖÇ ve Bloom düzeyiyle etiketlenir; belirtke tablosu, A/B kitapçık ve MEDEK denetimi kendiliğinden oluşur. Resmi Word ve A4 PDF tek tıkta." },
  { icon: BookOpenCheck, title: "Word'den soru aktarma ve banka", body: "Hazır sınavınızı yapıştırın: numara, puan, şıklar, doğru cevap, kod ve Bloom düzeyi algılanır. Sorular dönemler arası soru bankasında yaşar." },
  { icon: CalendarClock, title: "Çakışmasız sınav programı", body: "Sınıf, derslik, gözetmen ve öğrenci düzeyinde çakışma yok. Kalabalık dersler otomatik bölünür, gözetmen yükü standart sapmaya göre dengelenir." },
  { icon: LayoutGrid, title: "Kelebek düzeni ve tutanaklar", body: "OBS listesinden KVKK maskeli kapı listesi, imzalı yoklama tutanağı, sınav zarfı etiketi ve kanıt klasörü kapakları." },
  { icon: ClipboardList, title: "Analitik rubrikler", body: "Proje, laboratuvar, sunum ve 3+1 iş yeri eğitimi için ÖÇ eşleşmeli dört düzeyli dereceli puanlama anahtarları." },
  { icon: LineChart, title: "ÖÇ/PÇ başarı ve PUKÖ", body: "Soru bazlı notlardan ÖÇ ve PÇ gerçekleşmesi hesaplanır; eşik altı çıktılar için kök neden ve eylem planıyla PUKÖ raporu yazılır." },
  { icon: Microscope, title: "Madde analizi", body: "Güçlük, ayırt edicilik (%27), madde-toplam korelasyonu, Cronbach α ve ölçmenin standart hatası — Ebel ölçütleriyle karar önerisi." },
  { icon: Network, title: "Program çıktıları panosu", body: "Dersler × PÇ planlanan katkı ve gerçekleşen başarı; hiçbir dersin desteklemediği çıktılar öz değerlendirme öncesinde görünür olur." },
  { icon: FileArchive, title: "Tek tık kanıt klasörü", body: "Bir sınavın bütün resmi belgeleri klasörlenmiş tek ZIP'te; her dosya SHA-256 bütünlük özetiyle listelenir." },
  { icon: FolderCheck, title: "Akreditasyon kanıt merkezi", body: "Kuruluşunuzu seçin: ölçütler, alt ölçütler ve kuruluşun kendi örnek kanıt listesi sayfa atfıyla gelir. Dosyalar şifreli eklenir; görev, öz değerlendirme ve kanıt paketi tek yerde." },
];

const STEPS = [
  { k: "01", t: "Hazırlık", d: "Ders kataloğu Bologna sayfasından, ÖÇ'ler ve sorular Word'den aktarılır." },
  { k: "02", t: "Operasyon", d: "Program, gözetmen tebliğleri, takvim dosyaları ve kapı listeleri üretilir." },
  { k: "03", t: "Ölçme", d: "Notlar girilir; ÖÇ, PÇ ve madde analizleri anında hesaplanır." },
  { k: "04", t: "Kalite", d: "PUKÖ raporu ve program panosu, seçtiğiniz akreditasyonun ölçütlerine kanıt olarak tek tıkla eklenir." },
];

const FAQ = [
  { q: "Verilerim nerede saklanıyor?", a: "Yalnızca kendi tarayıcınızda. Her koleksiyon IndexedDB'ye AES-256-GCM ile şifrelenerek yazılır. Hesap, sunucu veya bulut eşitlemesi yoktur; geliştirici dahil kimse verilerinizi göremez." },
  { q: "İnternet olmadan çalışır mı?", a: "Evet. Uygulama bir kez açıldıktan sonra uçak modunda da yeniden yüklenir; Word, Excel ve PDF çıktıları tamamen tarayıcıda üretilir." },
  { q: "Bilgisayar değiştirirsem ne olur?", a: "Tüm kasayı parolalı .akredite dosyası olarak indirip diğer bilgisayarda geri yükleyebilirsiniz. Paket PBKDF2 (100.000 iterasyon) ve AES-256-GCM ile şifrelenir." },
  { q: "Yapay zekâ verilerimi bir yere gönderir mi?", a: "Yalnızca siz bir AI eylemini başlattığınızda ve kendi anahtarınızla; istek tarayıcınızdan doğrudan seçtiğiniz sağlayıcıya gider. Öğrenci kimlik bilgileri hiçbir isteğe eklenmez. Tamamen yerel çalışmak için Ollama desteklenir." },
  { q: "Hangi akreditasyon kuruluşları destekleniyor?", a: "YÖKAK'ın tescilli 29 program akreditasyon kuruluşunun tamamı ile YÖKAK Kurumsal Akreditasyon Programı. Ölçütler ve örnek kanıtlar her kuruluşun kendi yayımladığı belgeden, belge ve sayfa atfıyla alınmıştır; belgede açıkça yazmayan kanıtlar “ölçütten türetilmiş” olarak ayrıca işaretlenir. Listede olmayan bir çerçeve (ör. iç denetim) için kendi ölçüt setinizi tanımlayabilirsiniz." },
  { q: "Kanıt dosyalarım nereye yükleniyor?", a: "Hiçbir yere. Eklediğiniz PDF, Word veya görsel dosyalar tarayıcınızda AES-256-GCM ile şifrelenip cihazınızdaki kasaya yazılır; .akredite yedeğine de şifreli olarak dahil edilir. Kanıt paketi ZIP'i yine tarayıcıda üretilir ve her dosyanın SHA-256 özetini içerir." },
];

const frameworks = (frameworkIndex as FrameworkIndexEntry[]).filter((f) => f.status !== "not_found");
const totals = frameworks.reduce((t, f) => ({ criteria: t.criteria + f.criteria, sub: t.sub + f.subcriteria, evidence: t.evidence + f.evidence, explicit: t.explicit + f.explicit }), { criteria: 0, sub: 0, evidence: 0, explicit: 0 });
const frameworkAccessed = "23.10.2026";
const num = (n: number) => n.toLocaleString("tr-TR");

export default function Landing() {
  const withLogo = UNIVERSITIES.filter((u) => u.logo).length;
  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <HashRedirect />
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-dotgrid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_65%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Zero-Knowledge · tarayıcı içi şifreli
            </div>
            <h1 className="font-display mt-5 text-[44px] font-medium leading-[1.04] tracking-[-0.02em] text-zinc-950 sm:text-[58px]">
              Sınavdan akreditasyona,
              <br />
              <span className="text-brand-700">bütün dönem tek kasada.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-zinc-600">
              Akademisyenler, bölüm başkanları ve kalite komisyonları için sınav kağıdı, sınav programı, kapı listesi, rubrik, ÖÇ/PÇ analizi, PUKÖ raporu ve akreditasyon kanıt yönetimi. Verileriniz cihazınızdan hiç çıkmaz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
                Hemen başla — kurulum yok <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#guvenlik" className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300">
                <ShieldCheck className="h-4 w-4 text-brand-700" /> Güvenlik mimarisi
              </a>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-6 border-t border-zinc-200/80 pt-6 sm:grid-cols-4">
              {[
                ["AES-256", "GCM şifreleme"],
                ["0", "sunucuya istek"],
                [String(frameworks.length), "akreditasyon çerçevesi"],
                [String(withLogo), "üniversite logosu"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-mono text-[22px] text-zinc-950">{v}</dt>
                  <dd className="mt-0.5 text-[12.5px] text-zinc-500">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative h-[360px] sm:h-[460px]">
            <HeroLattice />
          </div>
        </div>
      </section>

      {/* Ürün görseli */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
            <span className="ml-3 font-mono text-[11px] text-zinc-400">akredite-sinav · Genel Bakış</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarımda next/image optimizasyonu yok */}
          <img src="/screens/overview-light.jpg" alt="AkrediteSınav Genel Bakış ekranı: dönem iş akışı, yaklaşan sınavlar ve hızlı eylemler" className="block w-full dark:hidden" loading="lazy" />
          {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarımda next/image optimizasyonu yok */}
          <img src="/screens/overview-dark.jpg" alt="AkrediteSınav Genel Bakış ekranı, koyu tema" className="hidden w-full dark:block" loading="lazy" />
        </div>
      </section>

      {/* Akış */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">Dönem iş akışı</div>
            <h2 className="font-display mt-3 text-[34px] font-medium leading-tight text-zinc-950">Dağınık Word dosyaları yerine tek bir akış.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">Genel Bakış ekranı dönemin neresinde olduğunuzu gösterir ve sıradaki adıma tek tıkla götürür.</p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.k} className="bg-white p-6">
                <div className="font-mono text-[12px] text-brand-700">{s.k}</div>
                <div className="mt-2 text-[16px] font-medium text-zinc-950">{s.t}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Özellikler */}
      <section id="ozellikler" className="scroll-mt-20 border-y border-zinc-200/70 bg-white/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">Modüller</div>
            <h2 className="font-display mt-3 text-[34px] font-medium leading-tight text-zinc-950">Ölçme-değerlendirmenin bütün kanıtları, ilk günden resmi formatta.</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-brand-700">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="mt-4 text-[15px] font-medium text-zinc-950">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Güvenlik */}
      <section id="guvenlik" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-2">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">Güvenlik</div>
            <h2 className="font-display mt-3 text-[34px] font-medium leading-tight text-zinc-950">Sınav soruları ve öğrenci listeleri hiçbir sunucuya gitmez.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
              Uygulama statik dosyalardan oluşur; çalışırken hiçbir uzak sunucuya veri göndermez. Bunu iddia etmekle kalmıyoruz: uygulama içindeki &quot;Güvenliği kanıtla&quot; penceresi diskteki şifreli baytları, canlı ağ günlüğünü ve çevrimdışı çalışmayı size gösterir.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { icon: Lock, t: "AES-256-GCM, her yazımda yeni IV", d: "Anahtar dışa aktarılamaz (non-extractable) bir cihaz anahtarıdır veya master parolanızdan PBKDF2 ile 100.000 iterasyonla türetilir." },
              { icon: KeyRound, t: "Şifreli taşınabilir yedek", d: ".akredite paketi parolanız olmadan açılamaz; değiştirilmiş dosya GCM doğrulamasından geçemez." },
              { icon: WifiOff, t: "İçerik Güvenlik Politikası ile ağ kilidi", d: "Tarayıcı, uygulamanın kendisi ve sizin seçtiğiniz AI sağlayıcısı dışındaki her adrese isteği engeller." },
              { icon: Plane, t: "Uçak modunda tam işlev", d: "Service Worker uygulama dosyalarını önbelleğe alır; internet kesikken sayfa yeniden yüklenir ve tüm çıktılar üretilir." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <div className="text-[14.5px] font-medium text-zinc-950">{t}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-500">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Akreditasyon */}
      <section id="akreditasyon" className="scroll-mt-20 border-y border-zinc-200/70 bg-white/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">Akreditasyon kanıt merkezi</div>
              <h2 className="font-display mt-3 text-[34px] font-medium leading-tight text-zinc-950">
                YÖKAK tescilli {ACCREDITATION_BODIES.length} kuruluşun tamamı, ölçüt ve örnek kanıtlarıyla
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
                {num(totals.criteria)} ölçüt, {num(totals.sub)} alt ölçüt ve {num(totals.evidence)} kanıt kalemi; her biri kuruluşun yayımladığı belgeden belge ve sayfa atfıyla. Bunların{" "}
                {num(totals.explicit)} tanesi kuruluşun kendi “örnek kanıt” listesinden birebir alınmıştır.
              </p>
            </div>
            <a href={YOKAK_REGISTRY_URL} target="_blank" rel="noreferrer noopener" className="text-[13px] font-medium text-brand-700 hover:underline">
              Tescil listesi: YÖKAK ({YOKAK_REGISTRY_ACCESSED.split("-").reverse().join(".")}) ↗
            </a>
          </div>
          <div className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {frameworks.map((f) => {
              const body = ACCREDITATION_BODIES.find((b) => b.code === f.registryCode);
              return (
                <div key={f.slug} className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3">
                  <span className="w-28 shrink-0 truncate font-mono text-[12.5px] font-medium text-zinc-900" title={f.code}>
                    {f.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-500" title={f.name}>
                    {body?.field ?? (f.kind === "institutional" ? "Kurumsal akreditasyon" : f.name)}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-400" title={`${f.criteria} ölçüt · ${f.evidence} kanıt kalemi`}>
                    {f.criteria}·{f.evidence}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] text-zinc-500">Sağdaki sayılar: ölçüt · kanıt kalemi. Kaynak belgeler {frameworkAccessed} tarihinde kuruluşların resmi sitelerinden alınmıştır.</p>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-display text-[34px] font-medium text-zinc-950">Sık sorulanlar</h2>
          <div className="mt-8 divide-y divide-zinc-200/80 border-y border-zinc-200/80">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium text-zinc-950">
                  {f.q}
                  <span className="text-zinc-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="theme-invariant relative overflow-hidden rounded-3xl bg-zinc-950 px-8 py-14 text-center sm:px-16">
          <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-40 [--dot-color:rgb(255_255_255/0.08)]" />
          <Sparkles className="relative mx-auto h-6 w-6 text-brand-400" />
          <h2 className="font-display relative mt-4 text-[32px] font-medium leading-tight text-white sm:text-[40px]">Bu dönemin sınavlarını bugün hazırlayın.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-zinc-400">Hesap açmanız gerekmez. Demo veriyle bütün çıktıları iki dakikada deneyin ya da kendi kurumunuzla başlayın.</p>
          <Link href="/app" className="relative mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200">
            Uygulamayı aç <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 text-[12.5px] text-zinc-500">
          <BrandMark className="h-6 w-6" />
          <span>AkrediteSınav · Zero-Knowledge akademik stüdyo</span>
          <span className="ml-auto flex items-center gap-4">
            <FlaskConical className="h-3.5 w-3.5" />
            <a href="https://github.com/osmancancet/akredite-sinav" target="_blank" rel="noreferrer noopener" className="hover:text-zinc-900">
              Kaynak kod
            </a>
            <span>© {new Date().getFullYear()}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
