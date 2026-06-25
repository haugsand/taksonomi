import "./CompletionBanner.css";

export function CompletionBanner({
  wordCount,
  categoryCount,
}: {
  wordCount: number;
  categoryCount: number;
}) {
  return (
    <div className="completion-banner">
      <p>
        Gratulerer! Du kombinerte {wordCount} ord til {categoryCount} kategorier.
      </p>
      <p>
        Start et nytt spill øverst til venstre. Ingen spill er like, med nye kategorier hver gang.
      </p>
    </div>
  );
}
