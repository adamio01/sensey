import Faq from "@/components/Faq";

const PAY_URL = "https://pay.tbank.ru/cdnOrQCl";

export default function Home() {
  return (
    <>
      {/* NAV */}
      <nav>
        <div className="logo">
          <span className="logo-dot" />
          SENSEY
        </div>
        <div className="nav-links">
          <a href="#program">Программа</a>
          <a href="#inside">Что внутри</a>
          <a href="#trainer">Тренер</a>
          <a href="#price">Цена</a>
          <a href="#faq">FAQ</a>
        </div>
        <a href={PAY_URL} className="nav-cta" target="_blank" rel="noopener noreferrer">
          Забрать
        </a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-layout">
          <div className="hero-photo">
            <img src="/trainer.jpg" alt="Тренер SENSEY" />
            <div className="hero-photo-frame" />
            <div className="hero-photo-tag-top">
              <span className="hero-photo-dot" />
              ONLINE / 24-7
            </div>
            <div className="hero-photo-badge">
              <div className="hero-photo-badge-line">Твой наставник</div>
              <div className="hero-photo-badge-name">SENSEY</div>
            </div>
          </div>

          <div className="hero-content">
            <div className="hero-tag">Школа мужчины</div>
            <h1>
              Стань <span className="accent">сильнее</span>,<br />
              чем <span className="strike">вчера</span> ты.
            </h1>
            <p className="hero-text">
              Программа для тех, кто <strong>устал быть мягким</strong>. Сила, удар, дисциплина —
              ежедневная работа, которая делает мужчину мужчиной.
            </p>
            <div className="hero-cta-block">
              <a href={PAY_URL} className="hero-cta" target="_blank" rel="noopener noreferrer">
                Вступить
                <span className="hero-cta-arrow">→</span>
              </a>
              <div className="hero-price">
                от <strong>2 990 ₽</strong> · доступ навсегда
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-inner">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} style={{ display: "inline-flex", gap: 60 }}>
              <span>СИЛА</span><span className="marquee-dot">●</span>
              <span>УДАР</span><span className="marquee-dot">●</span>
              <span>ДИСЦИПЛИНА</span><span className="marquee-dot">●</span>
              <span>ХАРАКТЕР</span><span className="marquee-dot">●</span>
              <span>ВОЛЯ</span><span className="marquee-dot">●</span>
              <span>SENSEY</span><span className="marquee-dot">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* PAIN POINTS */}
      <section className="section">
        <div className="section-header">
          <span className="section-eyebrow">// проблема</span>
          <h2 className="section-title">
            Узнаёшь <span className="accent">себя?</span>
          </h2>
          <p className="section-desc">
            Если хотя бы один пункт — про тебя, ты в нужном месте.
          </p>
        </div>
        <div className="pain-grid">
          <div className="pain-card">
            <div className="pain-num">01</div>
            <h3>Слабое тело</h3>
            <p>Зеркало раздражает. Лестница убивает. В драке — ты не уверен в себе.</p>
          </div>
          <div className="pain-card">
            <div className="pain-num">02</div>
            <h3>Нет дисциплины</h3>
            <p>Откладываешь, обещаешь себе с понедельника. Дни сливаются в одно.</p>
          </div>
          <div className="pain-card">
            <div className="pain-num">03</div>
            <h3>Нет уважения</h3>
            <p>Тебя не слышат — ни дома, ни на работе. Голос есть, веса нет.</p>
          </div>
          <div className="pain-card">
            <div className="pain-num">04</div>
            <h3>Боишься конфликта</h3>
            <p>Глотаешь, уступаешь, уходишь. Внутри — злоба. Снаружи — улыбка.</p>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="solution">
        <div className="solution-content">
          <h2>
            Хватит. Пора <em>построить</em> себя заново.
          </h2>
          <div className="solution-sub">90 дней. Программа. Результат.</div>
        </div>
      </section>

      {/* PROGRAM */}
      <section id="program" className="section program-bg">
        <div className="section-header">
          <span className="section-eyebrow">// программа</span>
          <h2 className="section-title">
            6 <span className="accent">модулей</span>
          </h2>
          <p className="section-desc">Каждый — отдельный этап. Без воды, только работа.</p>
        </div>
        <div className="modules">
          {[
            { n: "01", t: "База тела", d: "Отжимания, приседания, планки. Учимся держать форму. 21 день привычки.", tags: ["сила", "выносливость"] },
            { n: "02", t: "Удар", d: "Прямой, боковой, апперкот. Постановка стойки. Работа по воздуху и подушке.", tags: ["техника", "бокс"] },
            { n: "03", t: "Воля", d: "Холодный душ, ранние подъёмы, тишина. Учимся выдерживать, а не убегать.", tags: ["характер", "ритуалы"] },
            { n: "04", t: "Голова", d: "Книги, мышление, речь. Мужчина — это не только тело. Это и слово.", tags: ["мышление"] },
            { n: "05", t: "Защита", d: "Реальные ситуации. Что делать, когда подошли. Как не получить и как ответить.", tags: ["самооборона"] },
            { n: "06", t: "Кодекс", d: "Свод правил мужчины. Что ты делаешь и чего не делаешь никогда.", tags: ["принципы"] },
          ].map((m) => (
            <div key={m.n} className="module">
              <div className="module-num">{m.n}</div>
              <div className="module-content">
                <h3>{m.t}</h3>
                <p>{m.d}</p>
                <div className="module-tags">
                  {m.tags.map((t) => (
                    <span key={t} className="module-tag">{t}</span>
                  ))}
                </div>
              </div>
              <div className="module-icon">→</div>
            </div>
          ))}
        </div>
      </section>

      {/* INSIDE */}
      <section id="inside" className="inside">
        <div className="section-header">
          <span className="section-eyebrow">// что внутри</span>
          <h2 className="section-title">
            Что ты <span className="accent">получишь</span>
          </h2>
        </div>
        <div className="inside-grid">
          {[
            { n: "/ 01", t: "Видео-уроки", d: "60+ роликов. Техника, тренировки, теория. Доступ навсегда." },
            { n: "/ 02", t: "PDF-материалы", d: "Кодекс, программы питания, чек-листы привычек." },
            { n: "/ 03", t: "Чат сообщества", d: "Парни, которые идут с тобой. Поддержка и спрос." },
            { n: "/ 04", t: "Личная связь", d: "Возможность задать вопрос наставнику напрямую." },
            { n: "/ 05", t: "Обновления", d: "Программа обновляется. Ты получаешь всё новое бесплатно." },
            { n: "/ 06", t: "Сертификат", d: "По окончании — именной сертификат школы." },
          ].map((c) => (
            <div key={c.n} className="inside-card">
              <div className="inside-num">{c.n}</div>
              <h4>{c.t}</h4>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRAINER */}
      <section id="trainer" className="trainer">
        <div className="trainer-img">
          <img src="/trainer.jpg" alt="Тренер" />
          <div className="trainer-badge">Наставник</div>
        </div>
        <div className="trainer-content">
          <h2>Кто я.</h2>
          <p>
            Я прошёл путь от слабого парня, которого задирали, до тренера и наставника. Сейчас я
            учу тех, кто хочет того же — стать сильнее, увереннее, твёрже.
          </p>
          <p>
            В программе нет магии. Есть система, которая работала на мне и работает на каждом, кто
            идёт до конца.
          </p>
          <div className="trainer-stats">
            <div>
              <div className="trainer-stat-num">10+</div>
              <div className="trainer-stat-label">лет в спорте</div>
            </div>
            <div>
              <div className="trainer-stat-num">500+</div>
              <div className="trainer-stat-label">учеников</div>
            </div>
            <div>
              <div className="trainer-stat-num">90</div>
              <div className="trainer-stat-label">дней программы</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE */}
      <section id="price" className="price-section">
        <div className="section-header" style={{ margin: "0 auto 0", textAlign: "center" }}>
          <span className="section-eyebrow">// цена</span>
          <h2 className="section-title">
            Вход <span className="accent">в школу</span>
          </h2>
        </div>
        <div className="price-card">
          <div className="price-corner">Сейчас −60%</div>
          <div className="price-header">
            <div className="price-name">
              SENSEY <span className="accent">PRO</span>
            </div>
            <div className="price-tagline">Полный доступ. Навсегда.</div>
          </div>
          <div className="price-amount">
            <div className="price-old">6 990 ₽</div>
            <div className="price-now">
              2 990<span className="price-now-currency">₽</span>
            </div>
            <div className="price-period">единоразово · доступ навсегда</div>
          </div>
          <div className="price-features">
            <h5>// что входит</h5>
            <ul>
              <li>6 модулей. 90 дней работы</li>
              <li>60+ видео-уроков, доступ навсегда</li>
              <li>PDF-материалы, кодекс, чек-листы</li>
              <li>Чат сообщества и поддержка</li>
              <li>Личный канал связи с наставником</li>
              <li>Все будущие обновления бесплатно</li>
              <li>Сертификат школы</li>
            </ul>
          </div>
          <div className="price-cta-wrap">
            <a href={PAY_URL} className="price-cta" target="_blank" rel="noopener noreferrer">
              Забрать доступ
            </a>
            <div className="price-guarantee">
              <strong>Гарантия 7 дней.</strong> Не понравится — вернём деньги.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq">
        <div className="section-header" style={{ margin: "0 auto", textAlign: "center" }}>
          <span className="section-eyebrow">// вопросы</span>
          <h2 className="section-title">FAQ</h2>
        </div>
        <Faq />
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="final-cta-content">
          <h2>
            Готов <span className="accent">начать?</span>
          </h2>
          <p className="final-cta-sub">
            Решение занимает минуту. Результат — на всю жизнь.
          </p>
          <a href={PAY_URL} className="hero-cta" target="_blank" rel="noopener noreferrer">
            Вступить
            <span className="hero-cta-arrow">→</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div>© SENSEY — Школа мужчины</div>
        <div>Сила · Удар · Дисциплина</div>
      </footer>
    </>
  );
}
