/**
 * GcsCornerBrackets: Renders the 4 technical HUD corner brackets for aerospace cards.
 * Single Responsibility: Visual technical corner framing.
 */
export const GcsCornerBrackets = () => {
  return (
    <>
      <span aria-hidden="true" className="gcs-bracket gcs-bracket-tl" />
      <span aria-hidden="true" className="gcs-bracket gcs-bracket-tr" />
      <span aria-hidden="true" className="gcs-bracket gcs-bracket-bl" />
      <span aria-hidden="true" className="gcs-bracket gcs-bracket-br" />
    </>
  )
}

export default GcsCornerBrackets
