import Link from "next/link";
export default function NotFound() { return <div className="state-panel"><h1>404</h1><p>This analysis does not exist.</p><Link className="button primary" href="/">Back to overview</Link></div>; }
