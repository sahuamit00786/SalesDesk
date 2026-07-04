// Android resolves fonts by asset filename — never rely on fontWeight with custom fonts.
export const fonts = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  displayMedium: 'SpaceGrotesk-Medium',
  displaySemibold: 'SpaceGrotesk-SemiBold',
  displayBold: 'SpaceGrotesk-Bold',
};

// Scale mirrors web tailwind fontSize tokens (display/heading/subheading/body/caption)
export const typeScale = {
  display: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 38 },
  title: { fontFamily: fonts.displaySemibold, fontSize: 24, lineHeight: 31 },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17 },
  micro: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
};
