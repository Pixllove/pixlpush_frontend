"use client";

// Server components cannot pass NextLink as a `component` prop, so these wrap it on the client side.
import NextLink from "next/link";
import { Box, Button, type BoxProps, type ButtonProps } from "@mui/material";

export function LinkBox({ href, ...props }: BoxProps & { href: string }) {
  return <Box component={NextLink} href={href} {...props} />;
}

export function LinkButton({ href, ...props }: ButtonProps & { href: string }) {
  return <Button component={NextLink} href={href} {...props} />;
}
