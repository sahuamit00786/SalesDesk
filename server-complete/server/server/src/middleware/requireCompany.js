export function requireCompany(req, res, next) {
  if (!req.user?.companyId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_COMPANY',
        message: 'Your account must belong to a company to use this resource',
      },
    })
  }
  return next()
}
