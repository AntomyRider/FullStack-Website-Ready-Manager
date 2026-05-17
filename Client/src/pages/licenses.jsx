import { useEffect } from "react"
import { useLicensesStore } from "../store/licensesStore"
import { Trash2, RotateCcw } from 'lucide-react';
import SearchLicenses from "../components/licenses/search.licenses";
import TableLicenses from "../components/licenses/table.licenses";
const Licenses = () => {


  return (
    <div className="mt-5">
      <TableLicenses/>
    </div>
  )
}

export default Licenses