import { PHOTOS, type Photo } from "@/data/photos";

/** Photo credits (legal notice page): every photo with its place, author, licence and source,
 *  as the Creative Commons licences require. */
export function PhotoCredits({ title, locale }: { title: string; locale: string }) {
  const rows = Object.entries(PHOTOS) as [string, Photo][];
  return (
    <section id="photo-credits" className="mt-12 border-t border-border pt-8">
      <h2 className="text-[24px] font-bold">{title}</h2>
      <ul className="mt-5 space-y-3 text-[15px] leading-[1.55]">
        {rows.map(([id, p]) => (
          <li key={id}>
            <span className="font-medium">{locale === "fr" ? p.fr : p.en}</span>
            {" · "}
            {p.creator}
            {" · "}
            {p.licenseUrl ? (
              <a href={p.licenseUrl} target="_blank" rel="noreferrer" className="link">{p.license}</a>
            ) : (
              p.license
            )}
            {p.source && (
              <>
                {" · "}
                <a href={p.source} target="_blank" rel="noreferrer" className="link">Wikimedia Commons</a>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
