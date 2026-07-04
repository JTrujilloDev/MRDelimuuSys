import qz from "qz-tray";

let initialized = false;

export const initializeQZ = () => {
  if (initialized) return;

 qz.security.setCertificatePromise(async () => {
  const res = await fetch("http://localhost:3000/api/qz/certificate");
  return await res.text();
});

qz.security.setSignatureAlgorithm("SHA512");

qz.security.setSignaturePromise((toSign) => {
  return (resolve, reject) => {
    fetch("http://localhost:3000/api/qz/sign", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: toSign,
    })
      .then((r) => r.text())
      .then(resolve)
      .catch(reject);
  };
});

  initialized = true;
};
