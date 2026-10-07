// JavaScript + JSX: React components for writing poems and reading the public collection.
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

function SiteHeader({ activePage }) {
  return (
    <header className="site-header">
      <a className="brand" href="index.html" aria-label="Open Verse home">
        <span className="brand-mark" aria-hidden="true">v</span>
        <span>OPEN VERSE</span>
      </a>
      <nav aria-label="Main navigation">
        <a
          className={`nav-link${activePage === "write" ? " active" : ""}`}
          href="index.html"
          aria-current={activePage === "write" ? "page" : undefined}
        >
          Write
        </a>
        <a
          className={`nav-link${activePage === "poems" ? " active" : ""}`}
          href="poems.html"
          aria-current={activePage === "poems" ? "page" : undefined}
        >
          Read poems
        </a>
      </nav>
    </header>
  );
}

function SiteFooter({ message }) {
  return (
    <footer className="site-footer">
      <span>OPEN VERSE</span>
      <span>{message}</span>
    </footer>
  );
}

function WriterPage() {
  const [poet, setPoet] = useState("");
  const [title, setTitle] = useState("");
  const [poem, setPoem] = useState("");
  const [status, setStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    const submission = {
      poet: poet.trim(),
      title: title.trim(),
      poem: poem.trim()
    };

    if (!submission.poet || !submission.title || !submission.poem) {
      setStatus("Please fill in your name, title, and poem.");
      return;
    }

    if (!supabase) {
      setStatus("Add the Supabase project settings to the local .env file before publishing.");
      return;
    }

    setIsPublishing(true);
    try {
      const { error } = await supabase.functions.invoke("submit-poem", {
        body: submission
      });

      if (error) throw error;
      window.location.assign("poems.html?published=1");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The poem could not be published. Please try again.");
      setIsPublishing(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader activePage="write" />
      <main className="write-layout">
        <section className="write-main" aria-labelledby="page-title">
          <p className="eyebrow">A little room to write</p>
          <h1 id="page-title">Put your words<br />somewhere quiet.</h1>
          <p className="intro-copy">Give your poem a name, add your own, and send it out into the open.</p>

          <form className="poem-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="poet">Who is the poet?</label>
                <input
                  id="poet"
                  name="poet"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Your name"
                  value={poet}
                  onChange={(event) => setPoet(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="title">What is your poem called?</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  maxLength={120}
                  placeholder="Poem title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="poem">Your poem</label>
              <textarea
                id="poem"
                name="poem"
                maxLength={5000}
                rows={10}
                placeholder="Begin wherever you are..."
                value={poem}
                onChange={(event) => setPoem(event.target.value)}
                required
              />
              <div className="field-note">
                <span>Your line breaks will be kept.</span>
                <span aria-live="polite">{poem.length} / 5000</span>
              </div>
            </div>

            <div className="form-actions">
              <button className="button-primary" type="submit" disabled={isPublishing}>
                {isPublishing ? "Publishing..." : <>Publish poem <span aria-hidden="true">&#8594;</span></>}
              </button>
              <span className="form-status" role="status" aria-live="polite">{status}</span>
            </div>
          </form>
        </section>

        <aside className="write-note" aria-label="About publishing">
          <span className="note-index">01 / OPEN VERSE</span>
          <div className="note-rule" aria-hidden="true" />
          <h2>No account.<br />No gatekeeping.</h2>
          <p>Anyone can share a poem here. Once published, it will appear on the public poems page.</p>
          <a className="text-link" href="poems.html">Visit the poem shelf <span aria-hidden="true">&#8599;</span></a>
        </aside>
      </main>
      <SiteFooter message="Made for words worth sharing." />
    </div>
  );
}

function PoemEntry({ item }) {
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.created_at));

  return (
    <article className="poem-entry">
      <h3>{item.title}</h3>
      <p className="poem-byline">By {item.poet} · {date}</p>
      <p className="poem-body">{item.poem}</p>
    </article>
  );
}

function PoemsPage() {
  const [poems, setPoems] = useState([]);
  const [status, setStatus] = useState("Loading poems...");
  const wasPublished = new URLSearchParams(window.location.search).has("published");

  useEffect(() => {
    let ignoreResult = false;

    async function loadPoems() {
      if (!supabase) {
        setStatus("Add the Supabase project settings to the local .env file to load poems.");
        return;
      }

      const { data, error } = await supabase
        .from("poems")
        .select("id, poet, title, poem, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (ignoreResult) return;
      if (error) {
        setStatus("The poems could not be loaded. Please try again later.");
        return;
      }

      setPoems(data ?? []);
      setStatus(data?.length ? `${data.length} recent ${data.length === 1 ? "poem" : "poems"}` : "");
    }

    loadPoems().catch(() => {
      if (!ignoreResult) setStatus("The poems could not be loaded. Please try again later.");
    });

    return () => {
      ignoreResult = true;
    };
  }, []);

  return (
    <div className="site-shell">
      <SiteHeader activePage="poems" />
      <main className="shelf-main">
        <section className="shelf-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">The community collection</p>
            <h1 id="page-title">A shelf for<br />the words we share.</h1>
          </div>
          <p className="intro-copy">Poems from people passing through. Read a few, stay awhile, or leave something of your own.</p>
        </section>

        <div className="shelf-toolbar">
          <h2>Recent poems</h2>
          <a className="text-link" href="index.html">Write a poem <span aria-hidden="true">&#8594;</span></a>
        </div>

        <p className="collection-status" role="status" aria-live="polite">
          {wasPublished && poems.length ? "Your poem is published. Thank you for sharing it." : status}
        </p>
        <section className="poem-list" aria-label="Published poems">
          {poems.length
            ? poems.map((item) => <PoemEntry key={item.id} item={item} />)
            : status === "" && <p className="empty-state">The shelf is waiting for its first poem.</p>}
        </section>

        <SiteFooter message="Words belong to their writers." />
      </main>
    </div>
  );
}

export default function App() {
  return window.location.pathname.endsWith("poems.html")
    ? <PoemsPage />
    : <WriterPage />;
}