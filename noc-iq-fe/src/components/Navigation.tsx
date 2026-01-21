import Link from "next/link";

const Navigation = () => {
  return (
    <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
      <Link href="/">Dashboard</Link> | <Link href="/outages">Outages</Link> |{" "}
      <Link href="/payments">Payments</Link> |{" "}
      <Link href="/settings">Settings</Link>
    </nav>
  );
};

export default Navigation;
