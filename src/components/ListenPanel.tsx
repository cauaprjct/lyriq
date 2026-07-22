import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  youtubeId: string;
  title: string;
}

export function ListenPanel({ open, youtubeId, title }: Props) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="listen-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={`${title} no YouTube`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
