import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";


const data = [
  {
    name: "Mon",
    engagement: 400
  },
  {
    name: "Tue",
    engagement: 700
  },
  {
    name: "Wed",
    engagement: 500
  },
  {
    name: "Thu",
    engagement: 900
  },
  {
    name: "Fri",
    engagement: 1200
  },
  {
    name: "Sat",
    engagement: 1000
  },
  {
    name: "Sun",
    engagement: 1500
  }
];



export default function ChartCard() {


  return (

    <div

      className="
      bg-white
      rounded-3xl
      border
      border-blue-100
      p-6
      shadow-sm
      "

    >


      {/* Header */}

      <div

        className="
        flex
        justify-between
        items-center
        mb-8
        "

      >


        <div>


          <h2

            className="
            text-xl
            font-bold
            text-slate-900
            "

          >
            Engagement Overview
          </h2>


          <p

            className="
            text-sm
            text-slate-500
            mt-1
            "

          >
            Track your weekly social media growth
          </p>


        </div>



        <div

          className="
          bg-green-100
          text-green-700
          px-4
          py-2
          rounded-full
          text-sm
          font-semibold
          "

        >

          ↑ 18% Growth

        </div>


      </div>





      {/* Chart */}


      <ResponsiveContainer
        width="100%"
        height={320}
      >

        <AreaChart data={data}>


          <defs>

            <linearGradient
              id="blueGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >

              <stop
                offset="0%"
                stopColor="#2563eb"
                stopOpacity={0.4}
              />

              <stop
                offset="100%"
                stopColor="#2563eb"
                stopOpacity={0.05}
              />

            </linearGradient>


          </defs>



          <CartesianGrid
            strokeDasharray="4 4"
          />


          <XAxis
            dataKey="name"
          />


          <YAxis />


          <Tooltip />


          <Area

            type="monotone"

            dataKey="engagement"

            stroke="#2563eb"

            strokeWidth={3}

            fill="url(#blueGradient)"

          />


        </AreaChart>


      </ResponsiveContainer>



    </div>


  );

}