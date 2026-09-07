import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Section, SectionHeading } from "../ui/Section";
import Reveal from "../ui/Reveal";
import { FAQS } from "../../constants/content";
import { EASE } from "../../animations/variants";
import { useCursorHover } from "../../context/CursorContext";
import { Minus, Plus } from "../../icons/Icons";

function FaqItem({ item, open, onToggle }) {
  const hover = useCursorHover();
  return (
    <Reveal variant="up" className="faq-item glass glass--radius-sm">
      <h3>
        <button
          className="faq-item__q"
          aria-expanded={open}
          onClick={onToggle}
          {...hover}
        >
          {item.q}
          <span className="faq-item__icon">{open ? <Minus /> : <Plus />}</span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faq-item__a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <p>{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  );
}

/** Accordion FAQ — one panel open at a time. */
export default function Faq() {
  const [openId, setOpenId] = useState(FAQS[0].id);

  return (
    <Section id="faq">
      <SectionHeading center eyebrow="Questions Independents Ask Us" title="Most start with a 2-week Clarity Sprint." />
      <div className="faq">
        {FAQS.map((item) => (
          <FaqItem
            key={item.id}
            item={item}
            open={openId === item.id}
            onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
          />
        ))}
      </div>
    </Section>
  );
}
