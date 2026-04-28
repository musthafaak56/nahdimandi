const CREATOR_PORTFOLIO_URL = "https://musthafa-portfolio.web.app";

function CustomerCredits() {
  return (
    <footer className="mx-auto w-full max-w-5xl pt-2 text-center">
      <p className="text-sm text-ink/60">
        Created by{" "}
        <a
          href={CREATOR_PORTFOLIO_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-clove transition hover:text-ember"
        >
          Musthafa Abdul Kadar
        </a>
      </p>
    </footer>
  );
}

export default CustomerCredits;
