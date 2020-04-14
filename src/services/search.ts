import type { SearchOptions, Control, SearchEntry } from "ldapjs";
import type { FN } from "../typings/general-types";

export interface SearchFnInput extends FN {
  options?: SearchOptions;
  controls?: Control | Control[];
}

export async function search({
  client,
  base,
  options,
  controls,
}: SearchFnInput): Promise<SearchEntry[]> {
  /** default time limit for query 10 min
   * if not provided it in options, will use default
   */
  const timeLimit = options?.timeLimit ?? 6000;
  return new Promise((resolve, reject) => {
    if (controls) {
      client.search(
        base,
        { ...options, timeLimit },
        controls,
        function searchCallBack(err, res) {
          if (err) {
            reject(err);
          }
          res.on("error", function errorHandler(err) {
            reject(err);
          });

          const data: SearchEntry[] = [];
          res.on("searchEntry", function searchEntry(entry) {
            data.push(entry);
          });

          res.on("end", function searchEnd(res) {
            if (res?.status !== 0) {
              reject(res);
            }
            resolve(data);
          });
        },
      );
    } else {
      client.search(base, { ...options, timeLimit }, function searchCallBack(
        err,
        res,
      ) {
        if (err) {
          reject(err);
        }
        res.on("error", function errorHandler(err) {
          reject(err);
        });

        const data: SearchEntry[] = [];
        res.on("searchEntry", function searchEntry(entry) {
          data.push(entry);
        });

        res.on("end", function searchEnd(res) {
          if (res?.status !== 0) {
            reject(res);
          }
          resolve(data);
        });
      });
    }
  });
}
