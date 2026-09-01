import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatCardProps {

  title: string;
  value: string;
  change: string;
  icon: ReactNode;

}


export default function StatCard({
  title,
  value,
  change,
  icon
}: StatCardProps) {


  return (

    <motion.div

      whileHover={{
        y:-6
      }}

      transition={{
        duration:0.2
      }}

      className="
      bg-white
      rounded-3xl
      p-6
      border
      border-blue-100
      shadow-sm
      hover:shadow-xl
      hover:shadow-blue-100
      transition
      "

    >


      <div className="
        flex
        justify-between
        items-start
      ">


        <div

          className="
          w-14
          h-14
          rounded-2xl
          bg-gradient-to-br
          from-blue-500
          to-blue-700
          text-white
          flex
          items-center
          justify-center
          shadow-lg
          shadow-blue-200
          "

        >

          {icon}

        </div>



        <span

          className="
          text-xs
          font-semibold
          bg-green-100
          text-green-700
          px-3
          py-1
          rounded-full
          "

        >

          ↑ {change}

        </span>


      </div>




      <div className="mt-6">


        <h2

          className="
          text-4xl
          font-bold
          text-slate-900
          "

        >

          {value}

        </h2>



        <p

          className="
          text-slate-500
          mt-2
          "

        >

          {title}

        </p>


      </div>




      <div

        className="
        mt-5
        h-2
        bg-blue-50
        rounded-full
        overflow-hidden
        "

      >

        <div

          className="
          h-full
          w-3/4
          bg-blue-600
          rounded-full
          "

        />


      </div>



    </motion.div>

  );

}