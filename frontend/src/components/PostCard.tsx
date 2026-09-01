import {
  FaInstagram,
  FaFacebook,
  FaLinkedin
} from "react-icons/fa";


interface PostCardProps {

  title:string;
  platform:string;
  status:string;
  date:string;

}



export default function PostCard({

  title,
  platform,
  status,
  date

}:PostCardProps){



  const getIcon = ()=>{

    if(platform==="Instagram")
      return <FaInstagram size={22}/>;


    if(platform==="Facebook")
      return <FaFacebook size={22}/>;


    if(platform==="LinkedIn")
      return <FaLinkedin size={22}/>;


    return null;

  };




  return (

    <div

      className="
      bg-white
      rounded-3xl
      p-6
      border
      border-blue-100
      shadow-sm
      hover:shadow-xl
      transition
      flex
      justify-between
      items-center
      "

    >



      <div className="
      flex
      items-center
      gap-5
      ">


        <div

          className="
          w-14
          h-14
          rounded-2xl
          bg-blue-50
          text-blue-600
          flex
          items-center
          justify-center
          "

        >

          {getIcon()}

        </div>




        <div>


          <h3 className="
          text-lg
          font-bold
          ">

            {title}

          </h3>



          <p className="
          text-sm
          text-slate-500
          mt-2
          ">

            {platform} • {date}

          </p>


        </div>



      </div>





      <span

        className={`
        px-4
        py-2
        rounded-full
        text-sm
        font-semibold

        ${
          status==="Published"

          ?

          "bg-green-100 text-green-700"

          :

          "bg-yellow-100 text-yellow-700"

        }

        `}

      >

        {status}


      </span>



    </div>


  );

}