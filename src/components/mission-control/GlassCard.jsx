import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function GlassCard({ children, className, hover = false, onClick, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onClick}
      className={cn(
        "glass-card rounded-lg p-4",
        hover && "glass-card-hover cursor-pointer transition-all duration-200",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}