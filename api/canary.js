// Plain CommonJS canary: no TypeScript compilation, no external imports.
// Used to determine whether ALL functions fail (project-layer issue) or only TS-compiled ones.
module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    canary: 'js-cjs',
    time: new Date().toISOString(),
  });
};
